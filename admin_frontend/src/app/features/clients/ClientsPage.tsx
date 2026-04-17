import React from 'react';
import { useNavigate } from 'react-router';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { ClientDirectory } from '../../modules/ClientDirectory';

export const ClientsPage = () => {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.listClients(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live client accounts from the new admin backend."
        title="Loading Client Directory"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Client Directory Unavailable"
      />
    );
  }

  return (
    <ClientDirectory
      clients={data?.clients}
      onSelectClient={(client) => navigate(`/clients/${client.id}`)}
    />
  );
};
