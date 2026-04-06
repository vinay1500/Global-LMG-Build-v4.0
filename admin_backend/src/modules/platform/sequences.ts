import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { nowUtc, toMysqlDateTime } from '../../lib/datetime.js';

interface SequenceRow extends RowDataPacket {
  next_value: number;
}

export const allocateBusinessNumber = async (
  connection: PoolConnection,
  sequenceKey: string,
  prefix: string,
  year = new Date().getUTCFullYear()
) => {
  const existing = await connection.query<SequenceRow[]>(
    `SELECT next_value
     FROM business_sequences
     WHERE sequence_key = ? AND sequence_year = ?
     FOR UPDATE`,
    [sequenceKey, year]
  );

  const current = existing[0][0];
  const now = toMysqlDateTime(nowUtc());

  if (!current) {
    await connection.execute(
      `INSERT INTO business_sequences (
        sequence_key, sequence_year, next_value, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [sequenceKey, year, 2, now, now]
    );

    return `${prefix}-${year}-${String(1).padStart(3, '0')}`;
  }

  const sequenceValue = Number(current.next_value);

  await connection.execute(
    `UPDATE business_sequences
     SET next_value = ?, updated_at = ?
     WHERE sequence_key = ? AND sequence_year = ?`,
    [sequenceValue + 1, now, sequenceKey, year]
  );

  return `${prefix}-${year}-${String(sequenceValue).padStart(3, '0')}`;
};
