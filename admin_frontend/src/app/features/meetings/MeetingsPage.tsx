import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { MeetingsWorkspace } from '../../modules/MeetingsWorkspace';

export const MeetingsPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getEventsWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live events, clients, and matter lookups from the admin backend."
        title="Loading Meetings Workspace"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Meetings Workspace Unavailable"
      />
    );
  }

  return (
    <MeetingsWorkspace
      clients={data?.clients || []}
      events={data?.events || []}
      matters={data?.matters || []}
      onCreateEvent={async (payload) => {
        await adminApi.createEvent(payload);
        await refresh();
      }}
    />
  );
};
