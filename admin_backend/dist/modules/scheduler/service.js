import { env } from '../../config/env.js';
import { fromMysqlDateTime, nowUtc, toMysqlDateTime } from '../../lib/datetime.js';
import { createPublicId } from '../../lib/ids.js';
import { getMysqlPool } from '../../lib/mysql.js';
import { executeResult, selectAll, withTransaction } from '../../lib/mysqlUtils.js';
import { logEvent } from '../../lib/observability.js';
import { processEventLifecycleJob } from '../events/lifecycleWorker.js';
import { transactionalEmailService } from '../notifications/emailService.js';
import { adminNotificationService } from '../notifications/service.js';
import { adminJobQueue } from './jobQueue.js';
let intervalHandle = null;
let tickPromise = null;
const reminderLeaseDurationMs = 5 * 60 * 1000;
const claimDueReminders = async (limit = 50) => withTransaction(getMysqlPool(), async (connection) => {
    const leaseToken = createPublicId();
    const claimedAt = toMysqlDateTime(nowUtc());
    const leaseExpiresAt = toMysqlDateTime(new Date(Date.now() + reminderLeaseDurationMs).toISOString());
    const rows = await selectAll(connection, `SELECT
         er.id,
         er.event_id,
         er.attempt_count,
         er.recipient_user_id,
         u.email AS recipient_email,
         e.public_id AS event_public_id,
         e.matter_id,
         e.title AS event_title,
         e.scheduled_start_at,
         CONCAT(
           'Reminder: ', e.title, '\n\nStarts: ', e.scheduled_start_at,
           '\nJoin: ', COALESCE(e.join_url, e.location_text, 'Join details are available in the admin portal.')
         ) AS body_email
       FROM event_reminders er
       INNER JOIN events e
         ON e.id = er.event_id
       INNER JOIN users u
         ON u.id = er.recipient_user_id
       WHERE er.sent_at IS NULL
         AND er.delivery_status_code IN ('scheduled', 'retry')
         AND er.scheduled_at <= UTC_TIMESTAMP(6)
         AND (er.lease_expires_at IS NULL OR er.lease_expires_at < UTC_TIMESTAMP(6))
         AND e.status_code IN ('upcoming', 'rescheduled')
       ORDER BY er.scheduled_at ASC
       LIMIT ?
       FOR UPDATE SKIP LOCKED`, [limit]);
    if (rows.length === 0) {
        return [];
    }
    await connection.execute(`UPDATE event_reminders
       SET delivery_status_code = 'processing',
           lease_token = ?,
           claimed_at = ?,
           lease_expires_at = ?,
           attempt_count = attempt_count + 1
       WHERE id IN (${rows.map(() => '?').join(', ')})`, [leaseToken, claimedAt, leaseExpiresAt, ...rows.map((row) => row.id)]);
    return rows.map((row) => ({
        ...row,
        lease_token: leaseToken,
    }));
});
const finalizeReminderSuccess = async (reminder, providerReference) => withTransaction(getMysqlPool(), async (connection) => {
    const sentAt = toMysqlDateTime(nowUtc());
    await adminNotificationService.insertNotifications(connection, [Number(reminder.recipient_user_id)], {
        bodyText: `Upcoming meeting: ${reminder.event_title}`,
        eventId: Number(reminder.event_id),
        matterId: reminder.matter_id ? Number(reminder.matter_id) : null,
        notificationTypeCode: 'event_reminder',
        priorityCode: 'normal',
        title: 'Meeting reminder',
    });
    await executeResult(connection, `UPDATE event_reminders
       SET sent_at = ?,
           delivery_status_code = 'sent',
           failure_reason = NULL,
           provider_reference = ?,
           lease_token = NULL,
           claimed_at = NULL,
           lease_expires_at = NULL
       WHERE id = ?
         AND lease_token = ?`, [sentAt, providerReference || null, reminder.id, reminder.lease_token]);
});
const finalizeReminderFailure = async (reminder, error) => withTransaction(getMysqlPool(), async (connection) => {
    const message = error instanceof Error ? error.message : String(error);
    const nextAttemptAt = toMysqlDateTime(new Date(Date.now() + Math.min(30 * 60_000, 30_000)).toISOString());
    const finalFailure = Number(reminder.attempt_count) + 1 >= 6;
    await executeResult(connection, `UPDATE event_reminders
       SET delivery_status_code = ?,
           scheduled_at = ?,
           failure_reason = ?,
           lease_token = NULL,
           claimed_at = NULL,
           lease_expires_at = NULL
       WHERE id = ?
         AND lease_token = ?`, [
        finalFailure ? 'failed' : 'retry',
        nextAttemptAt,
        message.slice(0, 255),
        reminder.id,
        reminder.lease_token,
    ]);
    logEvent('error', 'admin_reminder.failed', {
        error: message,
        eventId: reminder.event_public_id,
        reminderId: reminder.id,
        scheduledStartAt: fromMysqlDateTime(reminder.scheduled_start_at),
    });
});
const processDueReminders = async () => {
    const reminders = await claimDueReminders();
    for (const reminder of reminders) {
        try {
            const delivery = await transactionalEmailService.send({
                subject: `Upcoming Global LMG meeting: ${reminder.event_title}`,
                text: reminder.body_email,
                to: reminder.recipient_email,
            });
            await finalizeReminderSuccess(reminder, delivery.providerReference ?? null);
        }
        catch (error) {
            await finalizeReminderFailure(reminder, error);
        }
    }
};
const processAsyncJobs = async () => {
    const jobs = await adminJobQueue.claimDueJobs(20);
    for (const job of jobs) {
        try {
            if (job.typeCode === 'event_lifecycle') {
                await processEventLifecycleJob(job.payload);
            }
            await adminJobQueue.completeJob(job.id, job.leaseToken);
        }
        catch (error) {
            await adminJobQueue.failJob(job, error);
            logEvent('error', 'admin_async_job.failed', {
                error: error instanceof Error ? error.message : String(error),
                jobId: job.publicId,
                typeCode: job.typeCode,
            });
        }
    }
};
const processSchedulerTick = async () => {
    await processAsyncJobs();
    await processDueReminders();
};
const runTick = async () => {
    if (tickPromise) {
        return tickPromise;
    }
    tickPromise = processSchedulerTick().finally(() => {
        tickPromise = null;
    });
    return tickPromise;
};
export const startReminderWorker = () => {
    if (intervalHandle || !env.REMINDER_WORKER_ENABLED) {
        return;
    }
    intervalHandle = setInterval(() => {
        void runTick();
    }, env.REMINDER_POLL_INTERVAL_MS);
    void runTick();
};
export const stopReminderWorker = () => {
    if (!intervalHandle) {
        return;
    }
    clearInterval(intervalHandle);
    intervalHandle = null;
};
export const runReminderTick = async () => {
    await runTick();
};
