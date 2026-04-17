import type { RowDataPacket } from 'mysql2/promise';
import { queryRows } from '../../lib/mysql.js';

type SearchRow = RowDataPacket & {
  id: string;
  subtitle: string;
  title: string;
  type: 'Client' | 'Document' | 'Matter' | 'Message';
};

export const searchWorkspace = async (query: string) => {
  const normalized = `%${query.trim()}%`;

  const [clients, matters, documents, threads] = await Promise.all([
    queryRows<SearchRow>(
      `SELECT
         ca.public_id AS id,
         ca.display_name AS title,
         CONCAT(ca.primary_email, ' • ', COALESCE(addr.city, 'Region pending')) AS subtitle,
         'Client' AS type
       FROM client_accounts ca
       LEFT JOIN client_addresses addr
         ON addr.client_account_id = ca.id
        AND addr.is_primary = 1
        AND addr.archived_at IS NULL
       WHERE ca.archived_at IS NULL
         AND (ca.display_name LIKE ? OR ca.primary_email LIKE ? OR ca.primary_phone LIKE ?)
       ORDER BY ca.updated_at DESC
       LIMIT 5`,
      [normalized, normalized, normalized]
    ),
    queryRows<SearchRow>(
      `SELECT
         m.public_id AS id,
         m.title,
         CONCAT(m.matter_number, ' • ', ca.display_name) AS subtitle,
         'Matter' AS type
       FROM matters m
       JOIN client_accounts ca ON ca.id = m.client_account_id
       WHERE m.archived_at IS NULL
         AND (m.title LIKE ? OR m.matter_number LIKE ? OR ca.display_name LIKE ?)
       ORDER BY m.last_activity_at DESC
       LIMIT 5`,
      [normalized, normalized, normalized]
    ),
    queryRows<SearchRow>(
      `SELECT
         d.public_id AS id,
         COALESCE(dv.original_file_name, d.title) AS title,
         CONCAT(ca.display_name, CASE WHEN m.title IS NOT NULL THEN CONCAT(' • ', m.title) ELSE '' END) AS subtitle,
         'Document' AS type
       FROM documents d
       JOIN client_accounts ca ON ca.id = d.owner_client_account_id
       LEFT JOIN document_versions dv ON dv.document_id = d.id AND dv.is_current = 1
       LEFT JOIN matter_documents md ON md.document_id = d.id
       LEFT JOIN matters m ON m.id = md.matter_id
       WHERE d.archived_at IS NULL
         AND (COALESCE(dv.original_file_name, d.title) LIKE ? OR ca.display_name LIKE ? OR COALESCE(m.title, '') LIKE ?)
       ORDER BY d.updated_at DESC
       LIMIT 5`,
      [normalized, normalized, normalized]
    ),
    queryRows<SearchRow>(
      `SELECT
         ct.public_id AS id,
         ca.display_name AS title,
         COALESCE(m.title, ct.subject, 'General inquiry') AS subtitle,
         'Message' AS type
       FROM conversation_threads ct
       JOIN client_accounts ca ON ca.id = ct.client_account_id
       LEFT JOIN matters m ON m.id = ct.matter_id
       LEFT JOIN messages lm ON lm.id = (
         SELECT inner_msg.id
         FROM messages inner_msg
         WHERE inner_msg.thread_id = ct.id
           AND inner_msg.deleted_at IS NULL
         ORDER BY inner_msg.sent_at DESC, inner_msg.id DESC
         LIMIT 1
       )
       WHERE ct.archived_at IS NULL
         AND (
           ca.display_name LIKE ?
           OR COALESCE(m.title, '') LIKE ?
           OR COALESCE(lm.body_text, '') LIKE ?
         )
       ORDER BY COALESCE(lm.sent_at, ct.updated_at) DESC
       LIMIT 5`,
      [normalized, normalized, normalized]
    ),
  ]);

  return {
    results: [...clients, ...matters, ...documents, ...threads].slice(0, 15),
  };
};
