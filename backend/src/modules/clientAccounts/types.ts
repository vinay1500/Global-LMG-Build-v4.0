export interface NotificationPreferences {
  caseActivityAlerts: boolean;
  emailUpdates: boolean;
  inAppAlerts: boolean;
  invoiceReminders: boolean;
  productAnnouncements: boolean;
  smsAlerts: boolean;
  whatsappAlerts: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  caseActivityAlerts: true,
  emailUpdates: true,
  inAppAlerts: true,
  invoiceReminders: true,
  productAnnouncements: false,
  smsAlerts: true,
  whatsappAlerts: false,
};
