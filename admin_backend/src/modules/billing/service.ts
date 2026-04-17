import { fetchInvoices, fetchPayments } from '../shared.js';

export const getWorkspace = async () => {
  return {
    invoices: await fetchInvoices({}),
    payments: await fetchPayments(),
  };
};
