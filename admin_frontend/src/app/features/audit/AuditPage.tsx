import React, { useState } from 'react';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { AuditExplorer } from '../../modules/AuditExplorer';

export const AuditPage = () => {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getAuditEntries({ limit, offset }),
    [limit, offset]
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Loading audit events and change summaries."
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

  return (
    <>
      <AuditExplorer entries={data?.entries || []} />
      <PaginationControls
        isLoading={isLoading}
        onOffsetChange={setOffset}
        pagination={data?.pagination}
      />
    </>
  );
};
