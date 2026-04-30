import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { BillingWorkspace } from '../../modules/BillingWorkspace';

export const BillingPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getBillingWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live invoices and payment activity from the new admin backend."
        title="Loading Billing Workspace"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Billing Workspace Unavailable"
      />
    );
  }

  return (
    <BillingWorkspace
      invoiceSettings={data?.invoiceSettings}
      matters={data?.matters}
      onCreateInvoice={async (payload) => {
        const result = await adminApi.createInvoice(payload);
        await refresh();
        return result;
      }}
      invoices={data?.invoices}
      onCreateRefund={async (payload) => {
        await adminApi.createRefund(payload);
        await refresh();
      }}
      onRecordPayment={async (payload) => {
        const result = await adminApi.recordPayment(payload);
        await refresh();
        return result;
      }}
      onSendInvoice={async (invoiceId) => {
        const result = await adminApi.sendInvoice(invoiceId);
        await refresh();
        return result;
      }}
      payments={data?.payments}
      refunds={data?.refunds}
    />
  );
};
