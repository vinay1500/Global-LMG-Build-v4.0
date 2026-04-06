import { ensureDatabaseMigrations } from '../lib/migrations.js';
import { closeMysqlPool } from '../lib/mysql.js';
const run = async () => {
    await ensureDatabaseMigrations();
    console.log('Admin backend migrations applied successfully.');
};
void run()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => {
    await closeMysqlPool();
});
