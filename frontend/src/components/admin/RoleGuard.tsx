import { useAuth } from '../../contexts/useAuth';

type Props = {
  roles: string[];
  children: React.ReactNode;
};

export default function RoleGuard({ roles, children }: Props) {
  const { user } = useAuth();

  if (!user) return null;
  if (user.is_superuser) return <>{children}</>;
  if (user.roles.some(r => roles.includes(r))) return <>{children}</>;

  return null;
}
