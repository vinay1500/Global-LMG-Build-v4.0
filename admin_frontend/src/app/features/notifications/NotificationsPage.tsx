import React from 'react';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { NotificationsCenter } from '../../modules/NotificationsCenter';

export const NotificationsPage = () => {
  const [offset, setOffset] = React.useState(0);
  const limit = 50;
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionStatus, setActionStatus] = React.useState<string | null>(null);
  const [isProcessingReminders, setIsProcessingReminders] = React.useState(false);
  const [retryingReminderId, setRetryingReminderId] = React.useState<string | null>(null);
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    async () => {
      const [notifications, reminderWorkspace] = await Promise.all([
        adminApi.getNotifications({ limit, offset }),
        adminApi.getReminderWorkspace(),
      ]);

      return {
        notifications,
        reminderWorkspace,
      };
    },
    [limit, offset]
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Loading system notifications, client notifications, and reminders."
        title="Loading Notifications Center"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Notifications Center Unavailable"
      />
    );
  }

  return (
    <>
      <NotificationsCenter
        actionError={actionError}
        actionStatus={actionStatus}
        isProcessingReminders={isProcessingReminders}
        notifications={data?.notifications.notifications || []}
        onDismiss={async (notificationId) => {
          await adminApi.dismissNotification(notificationId);
          await refresh();
        }}
        onMarkAllRead={async (notificationIds) => {
          await Promise.all(notificationIds.map((notificationId) => adminApi.markNotificationRead(notificationId)));
          await refresh();
        }}
        onMarkAsRead={async (notificationId) => {
          await adminApi.markNotificationRead(notificationId);
          await refresh();
        }}
        onProcessReminders={async () => {
          setActionError(null);
          setActionStatus(null);
          setIsProcessingReminders(true);

          try {
            const result = await adminApi.processReminders();
            setActionStatus(
              `Processed ${result.processed} reminder(s); ${result.failed} failed and ${result.skipped} skipped.`
            );
            setOffset(0);
            await refresh();
          } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Reminder processing failed.');
          } finally {
            setIsProcessingReminders(false);
          }
        }}
        onRetryReminder={async (reminderId) => {
          setActionError(null);
          setActionStatus(null);
          setRetryingReminderId(reminderId);

          try {
            const result = await adminApi.retryReminder(reminderId);
            setActionStatus(
              result.status === 'already_sent'
                ? 'That reminder was already processed.'
                : result.status === 'skipped'
                  ? 'That reminder is no longer client-visible and was skipped.'
                  : 'Reminder retried and processed for portal delivery.'
            );
            await refresh();
          } catch (error) {
            setActionError(error instanceof Error ? error.message : 'Reminder retry failed.');
          } finally {
            setRetryingReminderId(null);
          }
        }}
        reminderWorkspace={data?.reminderWorkspace}
        retryingReminderId={retryingReminderId}
      />
      <PaginationControls
        isLoading={isLoading}
        onOffsetChange={setOffset}
        pagination={data?.notifications.pagination}
      />
    </>
  );
};
