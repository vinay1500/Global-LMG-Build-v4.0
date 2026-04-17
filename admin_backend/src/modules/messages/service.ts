import {
  fetchClientsByIds,
  fetchEvents,
  fetchInvoices,
  fetchMatters,
  fetchMessagesByThreadIds,
  fetchThreads,
} from '../shared.js';

export const getWorkspace = async () => {
  const threads = await fetchThreads({});

  if (threads.length === 0) {
    return {
      clients: [],
      events: [],
      invoices: [],
      matters: [],
      messages: [],
      threads: [],
    };
  }

  const clientIds = Array.from(new Set(threads.map((thread) => thread.clientId).filter(Boolean)));
  const matterIds = Array.from(new Set(threads.map((thread) => thread.matterId).filter(Boolean)));
  const [clients, matters, invoices, events, messages] = await Promise.all([
    fetchClientsByIds(clientIds),
    matterIds.length > 0 ? fetchMatters({ limit: 100, matterIds }) : Promise.resolve([]),
    fetchInvoices({ clientAccountIds: clientIds }),
    fetchEvents({ clientAccountIds: clientIds }),
    fetchMessagesByThreadIds(threads.map((thread) => thread.id)),
  ]);

  return {
    clients,
    events,
    invoices,
    matters,
    messages,
    threads,
  };
};
