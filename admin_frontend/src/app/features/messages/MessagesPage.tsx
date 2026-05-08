import React, { useState } from 'react';
import { PaginationControls } from '../../components/shared/PaginationControls';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { MessagesDeskAdmin } from '../../modules/MessagesDeskAdmin';

export const MessagesPage = () => {
  const [offset, setOffset] = useState(0);
  const limit = 50;
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getMessagesWorkspace({ limit, offset }),
    [limit, offset]
  );
  const { data: templatesData } = useAsyncResource(
    () => adminApi.getSettingsTemplates().catch(() => ({ templates: [] })),
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
    <>
      <MessagesDeskAdmin
        clients={data?.clients}
        events={data?.events}
        invoices={data?.invoices}
        matters={data?.matters}
        messages={data?.messages}
        messageTemplates={templatesData?.templates || []}
        onArchiveThread={async (threadId) => {
          await adminApi.archiveThread(threadId);
          await refresh();
        }}
        onDownloadAttachment={(documentId) => {
          window.open(adminApi.buildDocumentDownloadUrl(documentId), '_blank', 'noopener');
        }}
        onMarkThreadRead={async (threadId) => {
          await adminApi.markThreadRead(threadId);
          await refresh();
        }}
        onCreateThread={async (payload) => {
          const result = await adminApi.createMessageThread(payload);
          setOffset(0);
          await refresh();
          return result;
        }}
        onSendReply={async (threadId, content) => {
          await adminApi.replyToThread(threadId, { content, visibleToClient: true });
          await refresh();
        }}
        searchQuery=""
        threads={data?.threads}
      />
      <PaginationControls
        isLoading={isLoading}
        onOffsetChange={setOffset}
        pagination={data?.pagination}
      />
    </>
  );
};
