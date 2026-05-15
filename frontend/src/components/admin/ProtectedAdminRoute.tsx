import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { ADMIN_ROLES } from '../../utils/adminPermissions';

type Props = Readonly<{
  children: ReactNode;
}>;

export default function ProtectedAdminRoute({ children }: Props) {
  const { isAuthenticated, isAuthLoading, user } = useAuth();

  if (isAuthLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const hasAdminRole = user?.roles.some(role => ADMIN_ROLES.has(role));

  if (!user || (!hasAdminRole && !user.is_superuser)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
