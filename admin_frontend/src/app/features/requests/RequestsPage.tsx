import React from 'react';
import { useNavigate } from 'react-router';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import type { AdminRequestDecisionResponse } from '../../lib/api/contracts';
import { RequestsWorkspace } from '../../modules/RequestsWorkspace';

type RequestAction = 'approve' | 'convert' | 'decline' | 'request-info';

export const RequestsPage = () => {
  const navigate = useNavigate();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getRequestsWorkspace(),
    []
  );

  const handleRequestAction = async (
    action: RequestAction,
    requestId: string,
    note?: string
  ): Promise<AdminRequestDecisionResponse> => {
    let result: AdminRequestDecisionResponse;

    if (action === 'approve') {
      result = await adminApi.approveRequest(requestId, { note });
    } else if (action === 'convert') {
      result = await adminApi.convertRequest(requestId, { note });
    } else if (action === 'decline') {
      result = await adminApi.declineRequest(requestId, { note });
    } else {
      result = await adminApi.requestInformation(requestId, { note: note || '' });
    }

    await refresh();
    return result;
  };

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
      onApprove={(requestId, note) => handleRequestAction('approve', requestId, note)}
      onConvert={(requestId, note) => handleRequestAction('convert', requestId, note)}
      onDecline={(requestId, note) => handleRequestAction('decline', requestId, note)}
      onOpenClient={(clientId) => navigate(`/clients/${clientId}`)}
      onOpenMatter={(matterId) => navigate(`/matters/${matterId}`)}
      onRequestInfo={(requestId, note) => handleRequestAction('request-info', requestId, note)}
      requests={data?.requests}
    />
  );
};
