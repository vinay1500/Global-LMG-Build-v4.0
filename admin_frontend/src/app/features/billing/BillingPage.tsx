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
      invoices={data?.invoices}
      onCreateRefund={async (payload) => {
        await adminApi.createRefund(payload);
        await refresh();
      }}
      payments={data?.payments}
      refunds={data?.refunds}
    />
  );
};
