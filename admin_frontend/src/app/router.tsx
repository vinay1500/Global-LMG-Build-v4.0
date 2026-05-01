import React from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AdminAccountPage } from './features/account/AdminAccountPage';
import { AccessDeniedPage } from './features/auth/AccessDeniedPage';
import { LoginPage } from './features/auth/LoginPage';
import { PasswordRotationPage } from './features/auth/PasswordRotationPage';
import { AuditPage } from './features/audit/AuditPage';
import { BillingPage } from './features/billing/BillingPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { MatterDetailPage } from './features/matters/MatterDetailPage';
import { MattersPage } from './features/matters/MattersPage';
import { MessagesPage } from './features/messages/MessagesPage';
import { MeetingsPage } from './features/meetings/MeetingsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { RequestsPage } from './features/requests/RequestsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { NotFoundPage } from './features/system/NotFoundPage';
import { TasksPage } from './features/tasks/TasksPage';
import { AdminLayout } from './layout/AdminLayout';
import { RequireAdminAuth } from './routes/RequireAdminAuth';

export const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<PasswordRotationPage />} />
      <Route path="/forbidden" element={<AccessDeniedPage />} />

      <Route element={<RequireAdminAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:clientId" element={<ClientDetailPage />} />
          <Route path="/matters" element={<MattersPage />} />
          <Route path="/matters/:matterId" element={<MatterDetailPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/account" element={<AdminAccountPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
