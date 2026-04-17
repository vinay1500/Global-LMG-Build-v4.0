import type { RowDataPacket } from 'mysql2/promise';
import { notFound } from '../../lib/httpErrors.js';
import { queryRows } from '../../lib/mysql.js';
import { fetchClientAudit, fetchDocuments, fetchEvents, fetchInvoices, fetchMatters, fetchThreads, fetchClientsForList } from '../shared.js';
import { mapLifecycle, toUiDate } from '../../lib/viewModels.js';

type ClientRow = RowDataPacket & {
  accountStatusCode: string;
  email: string;
  id: string;
  joinedAt: string;
  lastActiveAt: string | null;
  lifecycleSource: string;
  name: string;
  owner: string | null;
  phone: string;
  region: string | null;
};

export const listClients = async (options: { limit: number; offset: number; search?: string }) => {
  return {
    clients: await fetchClientsForList(options),
  };
};

export const getClientWorkspace = async (clientAccountId: string) => {
  const rows = await queryRows<ClientRow>(
    `SELECT
       ca.public_id AS id,
       ca.display_name AS name,
       ca.primary_email AS email,
       ca.primary_phone AS phone,
       ca.onboarding_status_code AS lifecycleSource,
       ca.account_status_code AS accountStatusCode,
       ca.created_at AS joinedAt,
       COALESCE(contact.last_login_at, ca.updated_at) AS lastActiveAt,
       owner.display_name AS owner,
       addr.city AS region
     FROM client_accounts ca
     LEFT JOIN users owner ON owner.id = ca.owner_user_id
     LEFT JOIN client_account_contacts cac
       ON cac.client_account_id = ca.id
      AND cac.is_primary = 1
      AND cac.archived_at IS NULL
     LEFT JOIN users contact ON contact.id = cac.user_id
     LEFT JOIN client_addresses addr
       ON addr.client_account_id = ca.id
      AND addr.is_primary = 1
      AND addr.archived_at IS NULL
     WHERE ca.public_id = ?
       AND ca.archived_at IS NULL
     LIMIT 1`,
    [clientAccountId]
  );

  const clientRow = rows[0];

  if (!clientRow) {
    throw notFound('client_not_found', 'Client account not found.');
  }

  const matters = await fetchMatters({ clientAccountIds: [clientAccountId] });
  const invoices = await fetchInvoices({ clientAccountIds: [clientAccountId] });
  const documents = await fetchDocuments({ clientAccountIds: [clientAccountId] });
  const events = await fetchEvents({ clientAccountIds: [clientAccountId] });
  const threads = await fetchThreads({ clientAccountIds: [clientAccountId] });
  const auditEntries = await fetchClientAudit(matters.map((matter) => matter.id));

  return {
    auditEntries,
    client: {
      email: clientRow.email,
      id: clientRow.id,
      joinedAt: toUiDate(clientRow.joinedAt),
      lastActiveAt: clientRow.lastActiveAt ? toUiDate(clientRow.lastActiveAt) : toUiDate(clientRow.joinedAt),
      lifecycle: mapLifecycle(clientRow.accountStatusCode, clientRow.lifecycleSource),
      name: clientRow.name,
      owner: clientRow.owner || 'Unassigned',
      phone: clientRow.phone,
      region: clientRow.region || '',
    },
    documents,
    events,
    invoices,
    matters,
    threads,
  };
};
