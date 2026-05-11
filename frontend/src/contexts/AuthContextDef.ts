import { createContext } from 'react';

export type AuthUser = {
  id: number;
  pseudo?: string;
  username?: string;
  email?: string;
  roles: string[];
  is_superuser: boolean;
};

export type AuthContextType = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  setAuthenticated: (auth: boolean) => void;
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  pendingAction: (() => void) | null;
  setPendingAction: (action: (() => void) | null) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
};

export const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAuthLoading: true,
  setAuthenticated: () => {},
  user: null,
  setUser: () => {},
  isAuthModalOpen: false,
  setAuthModalOpen: () => {},
  pendingAction: null,
  setPendingAction: () => {},
  authMode: 'login',
  setAuthMode: () => {},
});
