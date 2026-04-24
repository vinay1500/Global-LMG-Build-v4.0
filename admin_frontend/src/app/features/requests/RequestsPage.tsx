import React from 'react';
import { useNavigate } from 'react-router';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { RequestsWorkspace } from '../../modules/RequestsWorkspace';

export const RequestsPage = () => {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getRequestsWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Loading live service requests, consultation preferences, urgency rules, and conversion state."
        title="Loading Requests Intake"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Requests Intake Unavailable"
      />
    );
  }

  return (
    <RequestsWorkspace
      metrics={data?.metrics}
      onOpenClient={(clientId) => navigate(`/clients/${clientId}`)}
      onOpenMatter={(matterId) => navigate(`/matters/${matterId}`)}
      requests={data?.requests}
    />
  );
};
