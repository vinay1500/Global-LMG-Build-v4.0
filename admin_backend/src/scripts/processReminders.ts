import { closeMysqlPool } from '../lib/mysql.js';
import { processDueReminders } from '../modules/reminders/service.js';

const run = async () => {
  const result = await processDueReminders();
  process.stdout.write(`${JSON.stringify({ event: 'reminders.processed', ...result })}\n`);
};

run()
  .catch((error) => {
    process.stderr.write(
      `${JSON.stringify({
        error: error instanceof Error ? error.message : 'Reminder processing failed.',
        event: 'reminders.processing_failed',
      })}\n`
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMysqlPool();
  });
