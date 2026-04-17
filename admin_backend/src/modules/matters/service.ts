import { notFound } from '../../lib/httpErrors.js';
import { fetchDocuments, fetchEvents, fetchInvoices, fetchMatters, fetchThreads } from '../shared.js';

export const listMatters = async (options: { limit: number; search?: string }) => {
  return {
    matters: await fetchMatters({
      limit: options.limit,
      search: options.search,
    }),
  };
};

export const getMatterWorkspace = async (matterId: string) => {
  const matters = await fetchMatters({ matterIds: [matterId] });
  const matter = matters[0];

  if (!matter) {
    throw notFound('matter_not_found', 'Matter not found.');
  }

  return {
    documents: await fetchDocuments({ matterIds: [matterId] }),
    events: await fetchEvents({ matterIds: [matterId] }),
    invoices: await fetchInvoices({ matterIds: [matterId] }),
    matter,
    threads: await fetchThreads({ matterIds: [matterId] }),
  };
};
