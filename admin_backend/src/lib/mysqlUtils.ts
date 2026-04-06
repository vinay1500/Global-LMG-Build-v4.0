import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

export const withConnection = async <T>(
  pool: Pool,
  callback: (connection: PoolConnection) => Promise<T>
) => {
  const connection = await pool.getConnection();

  try {
    return await callback(connection);
  } finally {
    connection.release();
  }
};

export const withTransaction = async <T>(
  pool: Pool,
  callback: (connection: PoolConnection) => Promise<T>
) =>
  withConnection(pool, async (connection) => {
    await connection.beginTransaction();

    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  });

export const selectOne = async <TRow extends RowDataPacket>(
  connection: PoolConnection,
  query: string,
  values: Array<any> = []
) => {
  const [rows] = await connection.query<TRow[]>(query, values);
  return rows[0];
};

export const selectAll = async <TRow extends RowDataPacket>(
  connection: PoolConnection,
  query: string,
  values: Array<any> = []
) => {
  const [rows] = await connection.query<TRow[]>(query, values);
  return rows;
};

export const executeResult = async (
  connection: PoolConnection,
  query: string,
  values: Array<any> = []
) => {
  const [result] = await connection.execute<ResultSetHeader>(query, values);
  return result;
};
