export interface NotificationPreferences {
  caseActivityAlerts: boolean;
  emailUpdates: boolean;
  invoiceReminders: boolean;
  productAnnouncements: boolean;
  smsAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  caseActivityAlerts: true,
  emailUpdates: true,
  invoiceReminders: true,
  productAnnouncements: false,
  smsAlerts: true,
};
