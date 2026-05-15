import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { hasPermission } from '../../utils/adminPermissions';

type Props = Readonly<{
  permission: string;
  children: ReactNode;
}>;

export default function PermissionGuard({ permission, children }: Props) {
  const { user } = useAuth();

  if (!hasPermission(user, permission)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
