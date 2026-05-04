import React from 'react';
import { Link } from 'react-router';
import {
  Bell,
  CreditCard,
  LogOut,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  User,
} from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../../utils/dashboardFormatting';
import type {
  ChatMessage,
  Invoice,
  MessageThread,
  PlatformEvent,
  PlatformUser,
} from '../../../data/dashboardTypes';
import type { ClientAccountSettingsResponse, PortalNotificationResponse } from '../../../lib/api/contracts';

interface DashboardMessagesSectionProps {
  myThreads: MessageThread[];
  messages: ChatMessage[];
  selectedThread: string | null;
  messageInput: string;
  isSendingMessage: boolean;
  isUploadingAttachments: boolean;
  selectedAttachments: File[];
  threadSearchQuery: string;
  onSelectThread: (threadId: string) => void;
  onMessageInputChange: (value: string) => void;
  onThreadSearchQueryChange: (value: string) => void;
  onAttachmentSelect: (files: File[]) => void;
  onDownloadAttachment: (documentId: string) => void;
  onRemoveAttachment: (index: number) => void;
  onSendMessage: () => void;
}

export const DashboardMessagesSection = ({
  myThreads,
  messages,
  selectedThread,
  messageInput,
  isSendingMessage,
  isUploadingAttachments,
  selectedAttachments,
  threadSearchQuery,
  onSelectThread,
  onMessageInputChange,
  onThreadSearchQueryChange,
  onAttachmentSelect,
  onDownloadAttachment,
  onRemoveAttachment,
  onSendMessage,
}: DashboardMessagesSectionProps) => {
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);
  const safeText = (value: string | null | undefined, fallback = '') => value || fallback;
  const filteredThreads = myThreads.filter((thread) => {
    if (!threadSearchQuery.trim()) {
      return true;
    }

    const query = threadSearchQuery.trim().toLowerCase();
    return (
      safeText(thread.matterTitle, 'General Support').toLowerCase().includes(query) ||
      safeText(thread.matterRef).toLowerCase().includes(query) ||
      safeText(thread.assignedTo, 'Client Intake Desk').toLowerCase().includes(query)
    );
  });
  const activeThread = selectedThread
    ? filteredThreads.find((thread) => thread.id === selectedThread) || filteredThreads[0]
    : filteredThreads[0];
  const threadMessages = messages.filter((message) => message.threadId === activeThread?.id);

  return (
    <div className="space-y-0">
      <h1 className="mb-4 text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
        Messages
      </h1>
      <div
        className="flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <div className="hidden w-80 flex-shrink-0 overflow-y-auto border-r border-gray-100 md:block">
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={threadSearchQuery}
                onChange={(event) => onThreadSearchQueryChange(event.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-2 pl-8 pr-3 text-xs"
              />
            </div>
          </div>
          {filteredThreads.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              No conversations match your search.
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <div
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`cursor-pointer border-b border-gray-50 px-4 py-3 transition hover:bg-gray-50 ${
                  activeThread?.id === thread.id ? 'border-l-2 border-l-gray-900 bg-blue-50/50' : ''
                }`}
              >
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="flex-1 truncate text-sm">
                    {safeText(thread.matterTitle, 'General Support')}
                  </span>
                  {thread.unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] text-white">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-gray-400">{thread.lastMessage}</p>
                <p className="mt-0.5 text-[10px] text-gray-300">{formatDateTime(thread.lastMessageAt)}</p>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-1 flex-col">
          {activeThread ? (
            <>
              <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
                <div>
                  <h3 className="text-sm">
                    {safeText(activeThread.matterTitle, 'General Support')}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {activeThread.matterRef || 'Inquiry'} ·{' '}
                    {safeText(activeThread.assignedTo, 'Client Intake Desk')}
                  </p>
                </div>
                <div className="ml-auto">
                  <StatusBadge status={activeThread.stage} />
                </div>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {threadMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderRole === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        message.senderRole === 'client'
                          ? 'bg-gray-900 text-white'
                          : message.senderRole === 'system'
                            ? 'bg-gray-100 text-xs italic text-gray-500'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.senderRole !== 'client' && (
                        <p className="mb-0.5 text-[11px] text-gray-500">
                          {safeText(message.senderName, 'Global LMG')}
                        </p>
                      )}
                      <p className="text-sm">{safeText(message.content)}</p>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.attachments.map((attachment, index) => (
                            <button
                              key={`${message.id}-${attachment.documentId}-${index}`}
                              type="button"
                              onClick={() => onDownloadAttachment(attachment.documentId)}
                              className={`rounded-full px-2.5 py-1 text-[11px] ${
                                message.senderRole === 'client'
                                  ? 'bg-white/15 text-white'
                                  : 'bg-white text-gray-600'
                              }`}
                            >
                              {attachment.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-gray-400">{formatDateTime(message.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedAttachments.length > 0 && (
                <div className="border-t border-dashed border-gray-100 px-5 py-3">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {selectedAttachments.map((attachment, index) => (
                      <button
                        key={`${attachment.name}-${attachment.size}-${index}`}
                        type="button"
                        onClick={() => onRemoveAttachment(index)}
                        className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-gray-600 transition hover:bg-gray-200"
                      >
                        {attachment.name} x
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Attachments will be uploaded securely and sent with your next message.
                  </p>
                </div>
              )}
              <div className="flex gap-2 border-t border-gray-100 px-5 py-3">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  accept=".csv,.doc,.docx,.gif,.jpg,.jpeg,.pdf,.png,.txt,.webp,.xls,.xlsx,.zip"
                  className="hidden"
                  onChange={(event) => {
                    const files = event.target.files ? Array.from(event.target.files) : [];
                    if (files.length > 0) {
                      onAttachmentSelect(files);
                    }
                    event.currentTarget.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => attachmentInputRef.current?.click()}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <input
                  value={messageInput}
                  disabled={isSendingMessage || isUploadingAttachments}
                  onChange={(event) => onMessageInputChange(event.target.value)}
                  placeholder={
                    isUploadingAttachments
                      ? 'Uploading attachments...'
                      : isSendingMessage
                        ? 'Sending message...'
                        : 'Type a message...'
                  }
                  className="flex-1 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 text-sm"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      onSendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={onSendMessage}
                  disabled={isSendingMessage || isUploadingAttachments}
                  className="rounded-lg bg-gray-900 p-2 text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
              Select a conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface DashboardNotificationsSectionProps {
  myInvoices: Invoice[];
  myEvents: PlatformEvent[];
  myThreads: MessageThread[];
  notifications: PortalNotificationResponse[];
  onOpenMessages: (threadId: string | null) => void;
  onOpenBilling: () => void;
  onOpenCases: () => void;
  onOpenDocuments: () => void;
  onActOnNotification: (
    notificationId: string,
    actionTarget: PortalNotificationResponse['actionTarget'],
    threadId: string | null
  ) => void;
}

export const DashboardNotificationsSection = ({
  myInvoices,
  myEvents,
  myThreads,
  notifications,
  onOpenMessages,
  onOpenBilling,
  onOpenCases,
  onOpenDocuments,
  onActOnNotification,
}: DashboardNotificationsSectionProps) => {
  const billingNotifications = myInvoices
    .filter((invoice) => ['pending', 'sent', 'overdue'].includes(invoice.status))
    .map((invoice) => ({
      id: `invoice-${invoice.id}`,
      type: invoice.status === 'overdue' ? 'Billing Alert' : 'Billing',
      title:
        invoice.status === 'overdue'
          ? `Invoice ${invoice.id} is overdue`
          : `Invoice ${invoice.id} is ready for review`,
      description: `${invoice.matterTitle} · ${formatCurrency(invoice.totalAmount)}`,
      timestamp: invoice.dueDate,
      timestampLabel: `Due ${formatDate(invoice.dueDate)}`,
      meta: `Due ${formatDate(invoice.dueDate)}`,
      actionLabel: 'Open Billing',
      onAction: onOpenBilling,
    }));
  const notificationItems = notifications.map((notification) => ({
    actionLabel: notification.actionLabel,
    description: notification.description,
    id: notification.id,
    isRead: notification.isRead,
    meta: notification.meta,
    onAction: () =>
      onActOnNotification(notification.id, notification.actionTarget, notification.threadId),
    timestamp: notification.createdAt,
    timestampLabel: formatDateTime(notification.createdAt),
    title: notification.title,
    type: notification.typeLabel,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Notifications
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your notification center brings together unread messages, upcoming events, and billing
            reminders from your server-backed dashboard activity.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenMessages.bind(null, null)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          <MessageSquare className="h-4 w-4" /> Open Inbox
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Unread Messages',
            value: myThreads.reduce((sum, thread) => sum + thread.unreadCount, 0),
            accent: 'text-blue-600',
          },
          {
            label: 'Upcoming Events',
            value: myEvents.length,
            accent: 'text-indigo-600',
          },
          {
            label: 'Billing Alerts',
            value: billingNotifications.length,
            accent: 'text-amber-600',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-1 text-xs text-gray-500">{card.label}</p>
            <p className={`text-2xl ${card.accent}`} style={{ fontFamily: "'Playfair Display', serif" }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {notificationItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            No notifications right now. New activity will show up here as soon as your cases,
            invoices, or messages change.
          </div>
        ) : (
          notificationItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                item.isRead ? 'border-gray-100 opacity-80' : 'border-gray-100'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-gray-500">
                      {item.type}
                    </span>
                    <span className="text-xs text-gray-400">{item.meta}</span>
                  </div>
                  <h3 className="text-sm text-gray-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <span className="text-xs text-gray-400">{item.timestampLabel}</span>
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface DashboardSettingsSectionProps {
  user: PlatformUser;
  totalNotifications: number;
  preferences: {
    emailUpdates: boolean;
    inAppAlerts: boolean;
    smsAlerts: boolean;
    whatsappAlerts: boolean;
    invoiceReminders: boolean;
    caseActivityAlerts: boolean;
    productAnnouncements: boolean;
  };
  onPreferenceChange: (
    key:
      | 'emailUpdates'
      | 'inAppAlerts'
      | 'smsAlerts'
      | 'whatsappAlerts'
      | 'invoiceReminders'
      | 'caseActivityAlerts'
      | 'productAnnouncements',
    value: boolean
  ) => void;
  accountSettings: ClientAccountSettingsResponse | null;
  accountSettingsError?: string | null;
  isAccountSettingsLoading?: boolean;
  onChangePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  onConfirmEmailChange: (payload: { code: string; email: string }) => Promise<ClientAccountSettingsResponse>;
  onConfirmPhoneChange: (payload: { code: string; phone: string }) => Promise<ClientAccountSettingsResponse>;
  onRefreshAccountSettings: () => Promise<void>;
  onRequestEmailChange: (payload: { email: string }) => Promise<{ deliveryHint?: string; providerMode: string }>;
  onRequestPhoneChange: (payload: { phone: string }) => Promise<{ deliveryHint?: string; providerMode: string }>;
  onUpdateWhatsApp: (payload: {
    whatsappNumber: string;
    whatsappSameAsMobile: boolean;
  }) => Promise<ClientAccountSettingsResponse>;
  onOpenNotifications: () => void;
  onSignOut: () => void;
}

export const DashboardSettingsSection = ({
  user,
  totalNotifications,
  preferences,
  accountSettings,
  accountSettingsError,
  isAccountSettingsLoading = false,
  onChangePassword,
  onConfirmEmailChange,
  onConfirmPhoneChange,
  onRefreshAccountSettings,
  onRequestEmailChange,
  onRequestPhoneChange,
  onUpdateWhatsApp,
  onPreferenceChange,
  onOpenNotifications,
  onSignOut,
}: DashboardSettingsSectionProps) => {
  const [passwordForm, setPasswordForm] = React.useState({ currentPassword: '', newPassword: '' });
  const [emailForm, setEmailForm] = React.useState({ code: '', email: '' });
  const [phoneForm, setPhoneForm] = React.useState({ code: '', phone: '' });
  const [whatsappForm, setWhatsappForm] = React.useState({
    whatsappNumber: accountSettings?.account.whatsappNumber || user.phone,
    whatsappSameAsMobile: accountSettings?.account.whatsappSameAsMobile ?? true,
  });
  const [statusMessage, setStatusMessage] = React.useState('');
  const [actionError, setActionError] = React.useState('');
  const [isSavingAccount, setIsSavingAccount] = React.useState(false);

  React.useEffect(() => {
    if (!accountSettings) {
      return;
    }
    setWhatsappForm({
      whatsappNumber: accountSettings.account.whatsappNumber || accountSettings.account.phone,
      whatsappSameAsMobile: accountSettings.account.whatsappSameAsMobile,
    });
    setEmailForm((current) => ({ ...current, email: accountSettings.account.email }));
    setPhoneForm((current) => ({ ...current, phone: accountSettings.account.phone }));
  }, [accountSettings]);

  const runAccountAction = async (action: () => Promise<void>) => {
    setStatusMessage('');
    setActionError('');
    setIsSavingAccount(true);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Account action failed.');
    } finally {
      setIsSavingAccount(false);
    }
  };

  const providerStatus = accountSettings?.providerMode;
  const emailProviderDisabled = providerStatus?.email === 'disabled';
  const smsProviderDisabled = providerStatus?.sms === 'disabled';

  const preferenceItems = [
    {
      key: 'inAppAlerts' as const,
      label: 'In-app notifications',
      description: 'Portal notifications for messages, billing, documents, events, and matter activity.',
      icon: Bell,
    },
    {
      key: 'emailUpdates' as const,
      label: 'Email updates',
      description: emailProviderDisabled
        ? 'Email provider is disabled; this preference is saved for when delivery is configured.'
        : 'Matter progress, event reminders, and billing updates by email.',
      icon: Bell,
    },
    {
      key: 'smsAlerts' as const,
      label: 'SMS and phone alerts',
      description: smsProviderDisabled
        ? 'SMS provider is disabled; this preference is saved but no SMS is sent in this environment.'
        : 'Urgent notices and verification-related mobile updates.',
      icon: Smartphone,
    },
    {
      key: 'whatsappAlerts' as const,
      label: 'WhatsApp preference',
      description: 'Saved as an informational preference. No WhatsApp delivery provider is configured.',
      icon: Smartphone,
    },
    {
      key: 'invoiceReminders' as const,
      label: 'Invoice reminders',
      description: 'Reminders when an invoice is sent, due soon, or overdue.',
      icon: CreditCard,
    },
    {
      key: 'caseActivityAlerts' as const,
      label: 'Case activity alerts',
      description: 'Notifications when documents, notes, or milestones change.',
      icon: MessageSquare,
    },
    {
      key: 'productAnnouncements' as const,
      label: 'Product announcements',
      description: 'Future portal release notes and account feature updates.',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl" style={{ fontFamily: "'Playfair Display', serif" }}>
            Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Account security, verified contact details, and communication preferences for your portal profile.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenNotifications}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          <Bell className="h-4 w-4" /> Review Notifications ({totalNotifications})
        </button>
      </div>

      {accountSettingsError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {accountSettingsError}{' '}
          <button className="font-medium underline" onClick={() => void onRefreshAccountSettings()} type="button">
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-900">
            <User className="h-4 w-4" />
            <h2 className="text-sm">Account Details</h2>
          </div>
          <div className="space-y-3 text-sm text-gray-600">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Name</p>
              <p className="mt-1 text-gray-900">{accountSettings?.account.name || user.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Email</p>
              <p className="mt-1 text-gray-900">{accountSettings?.account.email || user.email}</p>
              <p className="text-xs text-gray-400">
                {accountSettings?.account.emailVerified ? 'Verified' : 'Verification pending'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Phone</p>
              <p className="mt-1 text-gray-900">{accountSettings?.account.phone || user.phone}</p>
              <p className="text-xs text-gray-400">
                {accountSettings?.account.phoneVerified ? 'Verified' : 'Verification pending'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-900">
            <Bell className="h-4 w-4" />
            <h2 className="text-sm">Delivery Modes</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p>In-app: local</p>
            <p>Email: {providerStatus?.email || 'loading'}</p>
            <p>SMS: {providerStatus?.sms || 'loading'}</p>
            <p>WhatsApp: informational only</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-gray-900">
            <Shield className="h-4 w-4" />
            <h2 className="text-sm">Security</h2>
          </div>
          <p className="text-sm text-gray-600">
            Password changes require your current password. Email and phone changes become active only after verification.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void runAccountAction(async () => {
              await onChangePassword(passwordForm);
              setPasswordForm({ currentPassword: '', newPassword: '' });
              setStatusMessage('Password changed.');
            });
          }}
        >
          <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
            Change Password
          </h2>
          <div className="mt-4 space-y-3">
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              placeholder="Current password"
              type="password"
              value={passwordForm.currentPassword}
            />
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
              placeholder="New strong password"
              type="password"
              value={passwordForm.newPassword}
            />
            <button
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={isSavingAccount || !passwordForm.currentPassword || !passwordForm.newPassword}
              type="submit"
            >
              Save Password
            </button>
          </div>
        </form>

        <form
          className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void runAccountAction(async () => {
              await onUpdateWhatsApp(whatsappForm);
              setStatusMessage('WhatsApp contact preference saved.');
            });
          }}
        >
          <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
            WhatsApp Contact
          </h2>
          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              checked={whatsappForm.whatsappSameAsMobile}
              onChange={(event) =>
                setWhatsappForm((current) => ({
                  ...current,
                  whatsappNumber: event.target.checked ? accountSettings?.account.phone || user.phone : current.whatsappNumber,
                  whatsappSameAsMobile: event.target.checked,
                }))
              }
              type="checkbox"
            />
            WhatsApp number is same as mobile
          </label>
          <input
            className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:bg-gray-50"
            disabled={whatsappForm.whatsappSameAsMobile}
            onChange={(event) => setWhatsappForm((current) => ({ ...current, whatsappNumber: event.target.value }))}
            placeholder="WhatsApp number"
            type="tel"
            value={whatsappForm.whatsappNumber}
          />
          <button className="mt-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={isSavingAccount} type="submit">
            Save Contact
          </button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Email Change</h2>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" onChange={(event) => setEmailForm((current) => ({ ...current, email: event.target.value }))} placeholder="New email" type="email" value={emailForm.email} />
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm" disabled={isSavingAccount || emailProviderDisabled} onClick={() => void runAccountAction(async () => { const result = await onRequestEmailChange({ email: emailForm.email }); setStatusMessage(result.deliveryHint || 'Verification code sent to the new email.'); })} type="button">
                Send Code
              </button>
              <input className="min-w-32 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" onChange={(event) => setEmailForm((current) => ({ ...current, code: event.target.value }))} placeholder="Code" value={emailForm.code} />
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={isSavingAccount || !emailForm.code} onClick={() => void runAccountAction(async () => { await onConfirmEmailChange(emailForm); setStatusMessage('Email verified and updated.'); })} type="button">
                Confirm
              </button>
            </div>
            {emailProviderDisabled ? <p className="text-xs text-amber-700">Email provider is disabled, so email changes cannot be verified in this environment.</p> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>Phone Change</h2>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" onChange={(event) => setPhoneForm((current) => ({ ...current, phone: event.target.value }))} placeholder="New phone" type="tel" value={phoneForm.phone} />
            <div className="flex flex-wrap gap-2">
              <button className="rounded-lg border border-gray-200 px-4 py-2 text-sm" disabled={isSavingAccount || smsProviderDisabled} onClick={() => void runAccountAction(async () => { const result = await onRequestPhoneChange({ phone: phoneForm.phone }); setStatusMessage(result.deliveryHint || 'OTP sent to the new phone.'); })} type="button">
                Send OTP
              </button>
              <input className="min-w-32 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" onChange={(event) => setPhoneForm((current) => ({ ...current, code: event.target.value }))} placeholder="OTP" value={phoneForm.code} />
              <button className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={isSavingAccount || !phoneForm.code} onClick={() => void runAccountAction(async () => { await onConfirmPhoneChange(phoneForm); setStatusMessage('Phone verified and updated.'); })} type="button">
                Confirm
              </button>
            </div>
            {smsProviderDisabled ? <p className="text-xs text-amber-700">SMS provider is disabled, so phone changes cannot be verified in this environment.</p> : null}
          </div>
        </div>
      </div>

      {isAccountSettingsLoading ? <p className="text-sm text-gray-500">Loading account settings...</p> : null}
      {actionError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div> : null}
      {statusMessage ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{statusMessage}</div> : null}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-500" />
          <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
            Communication Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {preferenceItems.map((preference) => {
            const Icon = preference.icon;
            const isEnabled = preferences[preference.key];

            return (
              <label
                key={preference.key}
                className="flex cursor-pointer items-start gap-4 rounded-xl border border-gray-100 px-4 py-4 transition hover:border-gray-200 hover:bg-gray-50/50"
              >
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-4 w-4 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">{preference.label}</p>
                  <p className="mt-1 text-sm text-gray-500">{preference.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(event) => onPreferenceChange(preference.key, event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-300"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
            Legal and Privacy Controls
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Public legal documents remain available from inside the dashboard while account settings are managed by the backend API.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/privacy" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
              Privacy Policy
            </Link>
            <Link to="/legal-disclaimer" className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 transition hover:bg-gray-50">
              Legal Disclaimer
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-red-100 bg-red-50/60 p-6 shadow-sm">
          <h2 className="text-lg text-red-700" style={{ fontFamily: "'Playfair Display', serif" }}>
            Session Controls
          </h2>
          <p className="mt-2 text-sm text-red-700/80">
            Use sign out to clear the active secure portal session on this device.
          </p>
          <button type="button" onClick={onSignOut} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
