import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { SettingsWorkspace } from '../../modules/SettingsWorkspace';

export const SettingsPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getSettingsWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Loading shared platform configuration, pricing rules, invoice settings, notification types, and governed RBAC metadata."
        title="Loading Settings"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Settings Unavailable"
      />
    );
  }

  if (!data) {
    return null;
  }

  return <SettingsWorkspace workspace={data} />;
};
