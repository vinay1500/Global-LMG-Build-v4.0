import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { SessionBootstrapPage } from '../features/auth/SessionBootstrapPage';
import { useAdminSession } from '../providers/AdminSessionProvider';

export const RequireAdminAuth = () => {
  const location = useLocation();
  const { isAuthenticated, isReady } = useAdminSession();

  if (!isReady) {
    return <SessionBootstrapPage />;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <Outlet />;
};
