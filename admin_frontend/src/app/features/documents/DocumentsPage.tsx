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

  return (
    <DocumentsCenterAdmin
      documentTypes={data?.documentTypes || []}
      documents={data?.documents || []}
      matters={data?.matters || []}
      buildDownloadUrl={adminApi.buildDocumentDownloadUrl}
      buildPreviewUrl={adminApi.buildDocumentPreviewUrl}
      onFetchDocumentDetail={adminApi.getDocumentDetail}
      onUpdateDocument={async (documentId, payload) => {
        await adminApi.updateDocumentControls(documentId, payload);
        await refresh();
      }}
      onUploadDocument={async (payload) => {
        await adminApi.uploadDocument(payload);
        await refresh();
      }}
      onUploadVersion={async (documentId, payload) => {
        await adminApi.uploadDocumentVersion(documentId, payload);
        await refresh();
      }}
      searchQuery=""
    />
  );
};
