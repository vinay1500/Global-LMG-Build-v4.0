import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { DocumentsCenterAdmin } from '../../modules/DocumentsCenterAdmin';

export const DocumentsPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getDocuments(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live matter and client documents from the new admin backend."
        title="Loading Documents Center"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Documents Center Unavailable"
      />
    );
  }

  return <DocumentsCenterAdmin documents={data?.documents || []} searchQuery="" />;
};
