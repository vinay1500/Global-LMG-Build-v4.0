import React from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { AccessDeniedPage } from './features/auth/AccessDeniedPage';
import { LoginPage } from './features/auth/LoginPage';
import { AuditPage } from './features/audit/AuditPage';
import { BillingPage } from './features/billing/BillingPage';
import { ClientDetailPage } from './features/clients/ClientDetailPage';
import { ClientsPage } from './features/clients/ClientsPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { DeferredModulePage } from './features/deferred/DeferredModulePage';
import { DocumentsPage } from './features/documents/DocumentsPage';
import { MatterDetailPage } from './features/matters/MatterDetailPage';
import { MattersPage } from './features/matters/MattersPage';
import { MessagesPage } from './features/messages/MessagesPage';
import { MeetingsPage } from './features/meetings/MeetingsPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { NotFoundPage } from './features/system/NotFoundPage';
import { AdminLayout } from './layout/AdminLayout';
import { RequireAdminAuth } from './routes/RequireAdminAuth';

export const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
          <Route path="/audit" element={<AuditPage />} />
          <Route
            path="/requests"
            element={
              <DeferredModulePage
                description="Requests has been intentionally deferred from Phase 1 while we stabilize the standalone admin shell."
                title="Requests Deferred"
              />
            }
          />
          <Route
            path="/tasks"
            element={
              <DeferredModulePage
                description="Tasks & Ops is deferred from Phase 1 and will stay visible only as a roadmap placeholder."
                title="Tasks Deferred"
              />
            }
          />
          <Route
            path="/reports"
            element={
              <DeferredModulePage
                description="Reports is deferred from Phase 1 and will be wired only after operational loops are live."
                title="Reports Deferred"
              />
            }
          />
          <Route
            path="/settings"
            element={
              <DeferredModulePage
                description="Settings is deferred from Phase 1 so we can keep focus on the runnable admin foundation."
                title="Settings Deferred"
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
