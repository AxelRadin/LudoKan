import React, { useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import { AuthContext } from './authContext';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setAuthenticated] = useState<boolean>(false);

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

  return (
    <AuthContext.Provider value={{ isAuthenticated, setAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
