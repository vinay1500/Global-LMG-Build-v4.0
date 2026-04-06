import { REQUEST_WIZARD_SERVICES } from '../data/requestWizardData';

export const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

export const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getServiceName = (id: string) =>
  REQUEST_WIZARD_SERVICES.find((service) => service.id === id)?.name ?? id;
