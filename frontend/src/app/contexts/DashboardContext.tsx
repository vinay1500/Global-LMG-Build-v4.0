import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { type RequestData } from '../data/requestWizardData';
import type { PlatformUser } from '../data/dashboardTypes';
import { dashboardApi } from '../lib/api/dashboard';
import { ApiRequestError } from '../lib/api/client';
import { uploadsApi } from '../lib/api/uploads';
import type {
  DashboardPackageSelectionResponse,
  DashboardSnapshotResponse,
  NotificationPreferencesResponse,
  PortalNotificationResponse,
} from '../lib/api/contracts';
import { useAuth } from './useAuth';
import { DashboardContext } from './DashboardContextStore';

type DashboardState = DashboardSnapshotResponse;

const EMPTY_CLIENT: PlatformUser = {
  avatar: '',
  email: '',
  id: '',
  joinedAt: '',
  lastActiveAt: '',
  lifecycle: 'registered',
  name: '',
  owner: '',
  phone: '',
  region: '',
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesResponse = {
  caseActivityAlerts: true,
  emailUpdates: true,
  invoiceReminders: true,
  productAnnouncements: false,
  smsAlerts: true,
};

const createEmptyDashboardState = (currentClient: PlatformUser): DashboardState => ({
  advocates: [],
  auditEntries: [],
  currentClient,
  documents: [],
  events: [],
  invoices: [],
  leads: [],
  matters: [],
  messages: [],
  packages: [],
  payments: [],
  staff: [],
  threads: [],
  users: currentClient.id ? [currentClient] : [],
});

const toErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof ApiRequestError && error.message) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
};

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, signOut } = useAuth();
  const [dashboardState, setDashboardState] = useState<DashboardState>(() =>
    createEmptyDashboardState(currentUser || EMPTY_CLIENT)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);
  const [isSelectingPackage, setIsSelectingPackage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferencesResponse>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [notifications, setNotifications] = useState<PortalNotificationResponse[]>([]);

  const resolveAuthExpiry = useCallback(
    async (error: unknown) => {
      if (error instanceof ApiRequestError && error.code === 'auth_required') {
        await signOut();
        return 'Your session expired. Please sign in again.';
      }

      return null;
    },
    [signOut]
  );

  const reloadDashboard = useCallback(async () => {
    if (!currentUser) {
      setDashboardState(createEmptyDashboardState(EMPTY_CLIENT));
      setNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES);
      setNotifications([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setDashboardState((previous) =>
      previous.currentClient.id === currentUser.id
        ? previous
        : createEmptyDashboardState(currentUser)
    );
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [snapshot, preferences, nextNotifications] = await Promise.all([
        dashboardApi.getSnapshot(),
        dashboardApi.getNotificationPreferences(),
        dashboardApi.getNotifications(),
      ]);
      setDashboardState(snapshot);
      setNotificationPreferences(preferences);
      setNotifications(nextNotifications);
    } catch (error) {
      const authError = await resolveAuthExpiry(error);
      if (authError) {
        setErrorMessage(authError);
        return;
      }

      setErrorMessage(
        toErrorMessage(error, 'We could not load your dashboard right now. Please try again.')
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, resolveAuthExpiry]);

  useEffect(() => {
    void reloadDashboard();
  }, [reloadDashboard]);

  const submitRequest = async (request: RequestData) => {
    setIsSubmittingRequest(true);
    setIsUploadingDocuments(request.documents.length > 0);
    setErrorMessage(null);

    try {
      let documentUploadIds: string[] = [];

      if (request.documents.length > 0) {
        const uploadedDocuments = await uploadsApi.uploadFiles(request.documents, {
          sourceModule: 'client-dashboard-request',
        });
        documentUploadIds = uploadedDocuments.map((entry) => entry.upload.id);
      }

      const snapshot = await dashboardApi.submitRequest(request, documentUploadIds);
      const nextNotifications = await dashboardApi.getNotifications();
      setDashboardState(snapshot);
      setNotifications(nextNotifications);
    } catch (error) {
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(error, 'We could not submit your request right now. Please try again.');

      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsSubmittingRequest(false);
      setIsUploadingDocuments(false);
    }
  };

  const sendMessage = async (threadId: string, content: string, attachments: File[] = []) => {
    const nextAttachments = attachments.filter((file) => file.size > 0);

    if (!content.trim() && nextAttachments.length === 0) {
      return;
    }

    setIsSendingMessage(true);
    setIsUploadingDocuments(nextAttachments.length > 0);
    setErrorMessage(null);

    try {
      let attachmentUploadIds: string[] = [];

      if (nextAttachments.length > 0) {
        const uploadedAttachments = await uploadsApi.uploadFiles(nextAttachments, {
          relatedEntityId: threadId,
          relatedEntityType: 'thread',
          sourceModule: 'client-dashboard-messages',
        });
        attachmentUploadIds = uploadedAttachments.map((entry) => entry.upload.id);
      }

      const snapshot = await dashboardApi.sendMessage({
        threadId,
        content,
        attachmentUploadIds,
      });
      const nextNotifications = await dashboardApi.getNotifications();
      setDashboardState(snapshot);
      setNotifications(nextNotifications);
    } catch (error) {
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(error, 'We could not send your message right now. Please try again.');

      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsSendingMessage(false);
      setIsUploadingDocuments(false);
    }
  };

  const markThreadRead = useCallback(async (threadId: string) => {
    try {
      const [snapshot, nextNotifications] = await Promise.all([
        dashboardApi.markThreadRead(threadId),
        dashboardApi.getNotifications(),
      ]);
      setDashboardState(snapshot);
      setNotifications(nextNotifications);
    } catch (error) {
      const authError = await resolveAuthExpiry(error);

      if (authError) {
        setErrorMessage(authError);
        throw new Error(authError);
      }

      throw error;
    }
  }, [resolveAuthExpiry]);

  const uploadDocuments = async (files: File[]) => {
    const nextFiles = files.filter((file) => file.size > 0);

    if (nextFiles.length === 0) {
      return;
    }

    setIsUploadingDocuments(true);
    setErrorMessage(null);

    try {
      await uploadsApi.uploadFiles(nextFiles, {
        sourceModule: 'client-dashboard-documents',
      });

      const [snapshot, nextNotifications] = await Promise.all([
        dashboardApi.getSnapshot(),
        dashboardApi.getNotifications(),
      ]);
      setDashboardState(snapshot);
      setNotifications(nextNotifications);
    } catch (error) {
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(
          error,
          'We could not upload your documents right now. Please try again.'
        );

      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsUploadingDocuments(false);
    }
  };

  const selectMatterPackage = async (
    matterId: string,
    matterPackageId: string,
    proposalVersion: number
  ): Promise<DashboardPackageSelectionResponse> => {
    setIsSelectingPackage(true);
    setErrorMessage(null);

    try {
      const response = await dashboardApi.selectMatterPackage(matterId, {
        matterPackageId,
        proposalVersion,
      });
      const nextNotifications = await dashboardApi.getNotifications();
      setDashboardState(response.snapshot);
      setNotifications(nextNotifications);
      return response;
    } catch (error) {
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(
          error,
          'We could not confirm that package right now. Please try again.'
        );

      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsSelectingPackage(false);
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    const previousNotifications = notifications;
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              isRead: true,
            }
          : notification
      )
    );

    try {
      await dashboardApi.markNotificationRead(notificationId);
    } catch (error) {
      setNotifications(previousNotifications);
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(
          error,
          'We could not update that notification right now. Please try again.'
        );

      setErrorMessage(message);
      throw new Error(message);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    const previousNotifications = notifications;
    setNotifications((current) =>
      current.filter((notification) => notification.id !== notificationId)
    );

    try {
      await dashboardApi.dismissNotification(notificationId);
    } catch (error) {
      setNotifications(previousNotifications);
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(
          error,
          'We could not dismiss that notification right now. Please try again.'
        );

      setErrorMessage(message);
      throw new Error(message);
    }
  };

  const updateNotificationPreferences = async (
    preferences: NotificationPreferencesResponse
  ) => {
    const previousPreferences = notificationPreferences;
    setIsSavingPreferences(true);
    setNotificationPreferences(preferences);
    setErrorMessage(null);

    try {
      const nextPreferences = await dashboardApi.updateNotificationPreferences(preferences);
      setNotificationPreferences(nextPreferences);
    } catch (error) {
      setNotificationPreferences(previousPreferences);
      const authError = await resolveAuthExpiry(error);
      const message =
        authError ||
        toErrorMessage(
          error,
          'We could not update your notification settings right now. Please try again.'
        );

      setErrorMessage(message);
      throw new Error(message);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <DashboardContext.Provider
      value={{
        ...dashboardState,
        isLoading,
        isSendingMessage,
        isSubmittingRequest,
        isSavingPreferences,
        isUploadingDocuments,
        isSelectingPackage,
        errorMessage,
        notificationPreferences,
        notifications,
        reloadDashboard,
        submitRequest,
        sendMessage,
        markThreadRead,
        selectMatterPackage,
        uploadDocuments,
        markNotificationRead,
        dismissNotification,
        updateNotificationPreferences,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};
