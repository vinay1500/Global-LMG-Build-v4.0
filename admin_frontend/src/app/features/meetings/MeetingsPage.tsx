import React, { useState } from 'react';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { MeetingsWorkspace } from '../../modules/MeetingsWorkspace';

export const MeetingsPage = () => {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getEventsWorkspace({ limit, offset }),
    [limit, offset]
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Loading meetings, clients, and matter lookups."
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
    <>
      <MeetingsWorkspace
        clients={data?.clients || []}
        events={data?.events || []}
        matters={data?.matters || []}
        onCreateEvent={async (payload) => {
          await adminApi.createEvent(payload);
          setOffset(0);
          await refresh();
        }}
        onCancelEvent={async (eventId, reason) => {
          await adminApi.cancelEvent(eventId, { reason });
          await refresh();
        }}
        onUpdateEvent={async (eventId, payload) => {
          await adminApi.updateEvent(eventId, payload);
          await refresh();
        }}
        onRetryCalendarSync={async (eventId) => {
          await adminApi.retryEventCalendarSync(eventId);
          await refresh();
        }}
      />
      <PaginationControls
        isLoading={isLoading}
        onOffsetChange={setOffset}
        pagination={data?.pagination}
      />
    </>
  );
};
