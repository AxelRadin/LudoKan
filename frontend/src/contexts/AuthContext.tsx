import React, { useContext, useEffect, useMemo, useState } from 'react';
import i18n from '../i18n';
import { apiGet } from '../services/api';
import { withDerivedPermissions } from '../utils/adminPermissions';
import { AuthContext, type AuthUser } from './AuthContextDef';
import { ThemeContext } from './themeContextValue';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);
  const [isAuthLoading, setAuthLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const { setDarkMode } = useContext(ThemeContext);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const me = withDerivedPermissions(
          (await apiGet('/api/me')) as AuthUser
        );
        if (!cancelled) {
          setAuthenticated(true);
          setUser(me);
          setDarkMode(me.theme_preference === 'dark');
          i18n.changeLanguage(me.language_preference || 'fr');
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
  }, [setDarkMode]);

  useEffect(() => {
    if (!isAuthenticated || user !== null) return;
    let cancelled = false;
    apiGet('/api/me')
      .then(me => {
        if (!cancelled) {
          const authUser = withDerivedPermissions(me as AuthUser);
          setUser(authUser);
          setDarkMode(authUser.theme_preference === 'dark');
          i18n.changeLanguage(authUser.language_preference || 'fr');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user, setDarkMode]);

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
