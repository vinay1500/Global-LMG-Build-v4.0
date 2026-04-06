export type NotificationActionTarget = 'billing' | 'cases' | 'documents' | 'messages';

export interface PortalNotification {
  actionLabel: string;
  actionTarget: NotificationActionTarget;
  createdAt: string;
  description: string;
  id: string;
  isRead: boolean;
  meta: string;
  priorityCode: string;
  threadId: string | null;
  title: string;
  typeCode: string;
  typeLabel: string;
}
