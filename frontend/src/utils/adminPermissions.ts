import type { AuthUser } from '../contexts/AuthContextDef';

const ROLE_PERMISSIONS: Record<string, string[]> = {
  moderator: [
    'user.view',
    'review_read',
    'rating_read',
    'report_read',
    'report_edit',
    'dashboard.view',
    'game_read',
    'support.view',
    'admin_action_read',
  ],
  admin: [
    'user.view',
    'user.suspend',
    'suspend_user',
    'user.edit',
    'review.moderate',
    'rating.moderate',
    'review_read',
    'review_edit',
    'review_delete',
    'rating_read',
    'rating_delete',
    'report_read',
    'report_edit',
    'dashboard.view',
    'import_export.user',
    'import_export.game',
    'import_export.review',
    'import_export.rating',
    'game_read',
    'game_edit',
    'game_delete',
    'support.view',
    'support.manage',
    'admin_action_read',
    'reports.export',
  ],
  superadmin: ['*'],
};

export const ADMIN_ROLES = new Set(['moderator', 'admin', 'superadmin']);

export function derivePermissions(user: AuthUser): string[] {
  if (user.is_superuser) return ['*'];

  const perms = new Set(user.permissions ?? []);
  for (const role of user.roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      perms.add(permission);
    }
  }
  return Array.from(perms);
}

export function withDerivedPermissions(user: AuthUser): AuthUser {
  return {
    ...user,
    permissions: derivePermissions(user),
  };
}

export function hasPermission(
  user: AuthUser | null,
  permission: string
): boolean {
  if (!user) return false;
  if (user.is_superuser) return true;
  if (user.permissions?.includes('*')) return true;
  return Boolean(user.permissions?.includes(permission));
}
