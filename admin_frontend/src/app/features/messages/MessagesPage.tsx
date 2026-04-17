import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { MessagesDeskAdmin } from '../../modules/MessagesDeskAdmin';

export const MessagesPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getMessagesWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live threads, messages, linked matters, invoices, and events."
        title="Loading Communications Desk"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Communications Desk Unavailable"
      />
    );
  }

  return (
    <MessagesDeskAdmin
      clients={data?.clients}
      events={data?.events}
      invoices={data?.invoices}
      matters={data?.matters}
      messages={data?.messages}
      onSendReply={async (threadId, content) => {
        await adminApi.replyToThread(threadId, { content, visibleToClient: true });
        await refresh();
      }}
      searchQuery=""
      threads={data?.threads}
    />
  );
};
