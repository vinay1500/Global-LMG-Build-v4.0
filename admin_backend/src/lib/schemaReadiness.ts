import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from './mysql.js';

type CountRow = RowDataPacket & {
  count: number;
};

const REQUIRED_PHASE5_TABLES = ['matter_package_features'];

const REQUIRED_PHASE5_COLUMNS: Array<{ column: string; table: string }> = [
  { table: 'matters', column: 'selected_matter_package_id' },
  { table: 'matter_packages', column: 'proposal_version_no' },
  { table: 'matter_packages', column: 'display_order' },
  { table: 'matter_packages', column: 'is_recommended' },
  { table: 'matter_packages', column: 'published_at' },
  { table: 'matter_packages', column: 'superseded_at' },
  { table: 'matter_packages', column: 'selected_at' },
  { table: 'invoices', column: 'matter_package_id' },
];

const hasTable = async (tableName: string) => {
  const rows = await queryRows<CountRow>(
    `SELECT COUNT(*) AS count
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = ?`,
    [tableName]
  );

  return Number(rows[0]?.count || 0) > 0;
};

const hasColumn = async (tableName: string, columnName: string) => {
  const rows = await queryRows<CountRow>(
    `SELECT COUNT(*) AS count
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND column_name = ?`,
    [tableName, columnName]
  );

  return Number(rows[0]?.count || 0) > 0;
};

export const ensurePhase5SchemaReadiness = async () => {
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  for (const tableName of REQUIRED_PHASE5_TABLES) {
    if (!(await hasTable(tableName))) {
      missingTables.push(tableName);
    }
  }

  for (const requirement of REQUIRED_PHASE5_COLUMNS) {
    if (!(await hasColumn(requirement.table, requirement.column))) {
      missingColumns.push(`${requirement.table}.${requirement.column}`);
    }
  }

  if (missingTables.length === 0 && missingColumns.length === 0) {
    return;
  }

  const missingParts = [
    missingTables.length ? `tables: ${missingTables.join(', ')}` : null,
    missingColumns.length ? `columns: ${missingColumns.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  throw new Error(
    `Phase 5 package schema is not applied for admin_backend (${missingParts}). ` +
      `Run backend migrations first (migration id: 012-package-proposal-lifecycle).`
  );
};
