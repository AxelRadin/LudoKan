import React, { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../services/api';
import { AuthContext } from './AuthContextDef';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Détermine l'état d'authentification au chargement de l'application
  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        await apiGet('/api/me');
        if (!cancelled) {
          setAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          setAuthenticated(false);
        }
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
      setAuthenticated,
      isAuthModalOpen,
      setAuthModalOpen,
      pendingAction,
      setPendingAction,
    }),
    [isAuthenticated, isAuthModalOpen, pendingAction]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
