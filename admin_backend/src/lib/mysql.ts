import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { env } from '../config/env.js';

let pool: Pool | null = null;

export const getMysqlPool = () => {
  if (!env.MYSQL_HOST || !env.MYSQL_DATABASE || !env.MYSQL_USER || !env.MYSQL_PASSWORD) {
    throw new Error('MySQL environment variables are incomplete for admin_backend.');
  }

  if (!pool) {
    pool = mysql.createPool({
      charset: 'utf8mb4',
      database: env.MYSQL_DATABASE,
      dateStrings: true,
      decimalNumbers: true,
      host: env.MYSQL_HOST,
      namedPlaceholders: false,
      password: env.MYSQL_PASSWORD,
      port: env.MYSQL_PORT,
      user: env.MYSQL_USER,
      waitForConnections: true,
    });
  }

  return pool;
};

export const queryRows = async <TRow extends RowDataPacket>(
  sql: string,
  params: unknown[] = []
): Promise<TRow[]> => {
  const [rows] = await getMysqlPool().query<TRow[]>(sql, params);
  return rows;
};

export const closeMysqlPool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
