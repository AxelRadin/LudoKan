import React, { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../services/api';
import { AuthContext, type AuthUser } from './AuthContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const me = (await apiGet('/api/me')) as AuthUser;
        if (!cancelled) {
          setAuthenticated(true);
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated,
      isAuthLoading,
      setAuthenticated,
      user,
      setUser,
      isAuthModalOpen,
      setAuthModalOpen,
      pendingAction,
      setPendingAction,
      authMode,
      setAuthMode,
    }),
    [
      isAuthenticated,
      isAuthLoading,
      user,
      isAuthModalOpen,
      pendingAction,
      authMode,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
