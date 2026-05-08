import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAdminSession } from '../providers/AdminSessionProvider';

export const RequirePermission: React.FC<{ permission: string }> = ({ permission }) => {
  const location = useLocation();
  const { currentUser } = useAdminSession();

  if (!currentUser?.permissionCodes.includes(permission)) {
    return <Navigate replace state={{ from: location.pathname, missingPermission: permission }} to="/forbidden" />;
  }

  return <Outlet />;
};
