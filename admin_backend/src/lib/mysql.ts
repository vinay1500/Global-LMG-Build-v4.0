import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

let mysqlPool: mysql.Pool | undefined;

export const getMysqlPool = () => {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      connectTimeout: env.MYSQL_CONNECTION_TIMEOUT_MS,
      dateStrings: true,
      database: env.MYSQL_DATABASE,
      host: env.MYSQL_HOST,
      password: env.MYSQL_PASSWORD,
      port: env.MYSQL_PORT,
      timezone: 'Z',
      user: env.MYSQL_USER,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return mysqlPool;
};

export const closeMysqlPool = async () => {
  if (!mysqlPool) {
    return;
  }

  const activePool = mysqlPool;
  mysqlPool = undefined;
  await activePool.end();
};
