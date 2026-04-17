import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { AuditExplorer } from '../../modules/AuditExplorer';

export const AuditPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getAuditEntries(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live audit events and change summaries from the admin backend."
        title="Loading Audit Explorer"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Audit Explorer Unavailable"
      />
    );
  }

  return <AuditExplorer entries={data?.entries || []} />;
};
