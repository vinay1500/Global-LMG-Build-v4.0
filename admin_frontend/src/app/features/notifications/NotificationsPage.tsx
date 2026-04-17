import React from 'react';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { NotificationsCenter } from '../../modules/NotificationsCenter';

export const NotificationsPage = () => {
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getNotifications(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Fetching live system and client-facing notifications from the shared admin backend."
        title="Loading Notifications Center"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Notifications Center Unavailable"
      />
    );
  }

  return (
    <NotificationsCenter
      notifications={data?.notifications || []}
      onDismiss={async (notificationId) => {
        await adminApi.dismissNotification(notificationId);
        await refresh();
      }}
      onMarkAllRead={async (notificationIds) => {
        await Promise.all(notificationIds.map((notificationId) => adminApi.markNotificationRead(notificationId)));
        await refresh();
      }}
      onMarkAsRead={async (notificationId) => {
        await adminApi.markNotificationRead(notificationId);
        await refresh();
      }}
    />
  );
};
