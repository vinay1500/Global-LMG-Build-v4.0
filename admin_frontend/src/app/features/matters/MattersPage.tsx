import React, { useMemo } from 'react';
import { useNavigate } from 'react-router';
import type { PlatformUser } from '../../data/seedData';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { MatterDeskAdmin } from '../../modules/MatterDeskAdmin';

export const MattersPage = () => {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.listMatters(),
    []
  );
  const clients = useMemo<PlatformUser[]>(
    () =>
      Array.from(
        new Map(
          (data?.matters || []).map((matter) => [
            matter.clientId,
            {
              avatar: '',
              email: '',
              id: matter.clientId,
              joinedAt: matter.createdAt,
              lastActiveAt: matter.lastUpdated,
              lifecycle: 'client' as const,
              name: matter.clientName,
              owner: matter.assignedStaff || '',
              phone: '',
              region: '',
            },
          ])
        ).values()
      ),
    [data]
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live matters from the new admin backend."
        title="Loading Matter Desk"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Matter Desk Unavailable"
      />
    );
  }

  return (
    <MatterDeskAdmin
      clients={clients}
      matters={data?.matters || []}
      onViewMatter={(matter) => navigate(`/matters/${matter.id}`)}
    />
  );
};
