import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import type { MatterWorkspaceResponse } from '../../lib/api/contracts';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { MatterDetailAdmin } from '../../modules/MatterDetailAdmin';

export const MatterDetailPage = () => {
  const navigate = useNavigate();
  const { matterId } = useParams();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getMatterWorkspace(String(matterId || '')),
    [matterId]
  );
  const [workspace, setWorkspace] = useState<MatterWorkspaceResponse | null>(null);

  useEffect(() => {
    if (data) {
      setWorkspace(data);
    }
  }, [data]);

  const matter = useMemo(
    () => (workspace?.matter?.id === matterId ? workspace.matter : null),
    [matterId, workspace]
  );

  if (!matterId) {
    return <Navigate replace to="/matters" />;
  }

  if (isLoading && !workspace) {
    return (
      <WorkspaceState
        description="Fetching the matter record, linked documents, events, invoices, and message threads."
        title="Loading Matter Workspace"
      />
    );
  }

  if (errorMessage && !workspace) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Matter Workspace Unavailable"
      />
    );
  }

  if (!matter) {
    return <Navigate replace to="/matters" />;
  }

  const handleUpdateFee = async (_targetMatterId: string, newFee: number) => {
    await adminApi.updateMatterDetails(String(matterId || ''), {
      quotedTotalAmount: newFee,
    });
    const nextWorkspace = await refresh();
    setWorkspace(nextWorkspace);
  };

  return (
    <MatterDetailAdmin
      assignmentOptions={workspace?.assignmentOptions}
      matter={matter}
      myDocs={workspace?.documents || []}
      myEvents={workspace?.events || []}
      myInvoices={workspace?.invoices || []}
      myThreads={workspace?.threads || []}
      onAddMatterNote={async (payload) => {
        await adminApi.createMatterNote(matter.id, payload);
        const nextWorkspace = await refresh();
        setWorkspace(nextWorkspace);
      }}
      onAssignMatter={async (payload) => {
        await adminApi.createMatterAssignment(matter.id, payload);
        const nextWorkspace = await refresh();
        setWorkspace(nextWorkspace);
      }}
      onBack={() => navigate('/matters')}
      onChat={() => navigate('/messages')}
      onCreateEvent={async (payload) => {
        await adminApi.createEvent({
          ...payload,
          clientAccountId: matter.clientId,
          matterId: matter.id,
        });
        const nextWorkspace = await refresh();
        setWorkspace(nextWorkspace);
      }}
      onSaveMatterDetails={async (payload) => {
        await adminApi.updateMatterDetails(matter.id, payload);
        const nextWorkspace = await refresh();
        setWorkspace(nextWorkspace);
      }}
      onUpdateFee={handleUpdateFee}
      onUpdateStage={async (payload) => {
        await adminApi.updateMatterStage(matter.id, payload);
        const nextWorkspace = await refresh();
        setWorkspace(nextWorkspace);
      }}
    />
  );
};
