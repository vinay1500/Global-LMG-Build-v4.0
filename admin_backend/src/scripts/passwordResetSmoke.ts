import { closeMysqlPool } from '../lib/mysql.js';
import { requestPasswordReset } from '../modules/auth/service.js';

const result = await requestPasswordReset(`missing-admin-${Date.now()}@globallmg.local`, {
  ipAddress: '127.0.0.1',
});

if (result.status !== 'password_reset_requested') {
  throw new Error('Password reset request did not return the generic requested status.');
}

if (!result.message.toLowerCase().includes('if an admin account exists')) {
  throw new Error('Password reset request response is not generic.');
}

if (!['email', 'manual'].includes(result.deliveryMode)) {
  throw new Error('Password reset delivery mode is not honest.');
}

await closeMysqlPool();
console.log('Admin password reset smoke passed.');
