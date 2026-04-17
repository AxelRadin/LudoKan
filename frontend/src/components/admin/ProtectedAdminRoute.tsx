import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';

const ADMIN_ROLES = ['moderator', 'admin', 'superadmin'];

type Props = { children: React.ReactNode };

export default function ProtectedAdminRoute({ children }: Props) {
  const { isAuthenticated, isAuthLoading, user } = useAuth();

  if (isAuthLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const hasAdminRole = user?.roles.some(r => ADMIN_ROLES.includes(r));
  if (!user || (!hasAdminRole && !user.is_superuser)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
