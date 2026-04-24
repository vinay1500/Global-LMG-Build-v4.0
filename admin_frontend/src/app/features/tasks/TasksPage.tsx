import React from 'react';
import { useNavigate } from 'react-router';
import { WorkspaceState } from '../../components/shared/WorkspaceState';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import { adminApi } from '../../lib/api/admin';
import { useAdminSession } from '../../providers/AdminSessionProvider';
import { TasksWorkspace } from '../../modules/TasksWorkspace';

export const TasksPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAdminSession();
  const { data, errorMessage, isLoading, refresh } = useAsyncResource(
    () => adminApi.getTasksWorkspace(),
    []
  );

  if (isLoading && !data) {
    return (
      <WorkspaceState
        description="Building the operations queue from matters, document backlog, unread threads, invoices, and upcoming events."
        title="Loading Tasks & Ops"
      />
    );
  }

  if (errorMessage && !data) {
    return (
      <WorkspaceState
        actionLabel="Try Again"
        description={errorMessage}
        onAction={() => void refresh().catch(() => undefined)}
        title="Tasks & Ops Unavailable"
      />
    );
  }

  return (
    <TasksWorkspace
      currentAssignee={currentUser?.displayName}
      metrics={data?.metrics}
      onOpenTask={(task) => {
        if (task.sourceType === 'matter') {
          navigate(`/matters/${task.sourceId}`);
          return;
        }

        if (task.sourceType === 'message') {
          navigate('/messages');
          return;
        }

        if (task.sourceType === 'document') {
          navigate('/documents');
          return;
        }

        if (task.sourceType === 'invoice') {
          navigate('/billing');
          return;
        }

        navigate('/meetings');
      }}
      tasks={data?.tasks}
    />
  );
};
