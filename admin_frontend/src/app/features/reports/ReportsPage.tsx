import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { ReportsWorkspace } from '../../modules/ReportsWorkspace';

export const ReportsPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getReportsWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Rendering live operational reporting for collections, intake conversion, aging, workload, and document review."
        title="Loading Firm Performance"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Firm Performance Unavailable"
      />
    );
  }

  if (!data) {
    return null;
  }

  return <ReportsWorkspace workspace={data} />;
};
