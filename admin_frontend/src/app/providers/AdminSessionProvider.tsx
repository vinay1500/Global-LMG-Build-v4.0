import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/api/auth';
import { ApiRequestError } from '../lib/api/client';
import type { AdminSessionUser } from '../lib/api/contracts';

type AdminSessionContextValue = {
  currentUser: AdminSessionUser | null;
  errorMessage: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  refreshSession: () => Promise<void>;
  signIn: (payload: {
    identifier: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<{ status: string }>;
  signOut: () => Promise<void>;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export const AdminSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AdminSessionUser | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authApi.getSession();
      setCurrentUser(session.authenticated ? session.user : null);
      setErrorMessage(null);
    } catch (error) {
      setCurrentUser(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to verify session.');
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(
    async (payload: { identifier: string; password: string; rememberMe: boolean }) => {
      setErrorMessage(null);
      const response = await authApi.signIn(payload);

      if (response.authenticated) {
        setCurrentUser(response.user ?? null);
        return { status: 'authenticated' };
      }

      throw new ApiRequestError(
        'admin_auth_incomplete',
        'This account needs an additional auth step before admin access.'
      );
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const value = useMemo<AdminSessionContextValue>(
    () => ({
      currentUser,
      errorMessage,
      isAuthenticated: Boolean(currentUser),
      isReady,
      refreshSession,
      signIn,
      signOut,
    }),
    [currentUser, errorMessage, isReady, refreshSession, signIn, signOut]
  );

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
};

export const useAdminSession = () => {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error('useAdminSession must be used within AdminSessionProvider.');
  }
  return context;
};
