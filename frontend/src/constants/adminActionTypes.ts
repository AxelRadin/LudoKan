/** Valeurs `action_type` connues dans le projet (filtre activité admin). */
export const ADMIN_ACTION_TYPE_OPTIONS: readonly string[] = [
  'user.suspend',
  'user.reactivate',
  'review.edit',
  'review.delete',
  'game.update',
  'game.delete',
  'rating.delete',
  'support.ticket.update',
  'system.maintenance',
];

/** Clés normalisées `domaine.action` (API stats peut envoyer des underscores). */
const ADMIN_ACTION_TYPE_LABELS_FR: Readonly<Record<string, string>> = {
  'user.suspend': "Suspension d'utilisateur",
  'user.reactivate': "Réactivation d'utilisateur",
  'review.edit': "Modification d'avis",
  'review.delete': "Suppression d'avis",
  'game.update': 'Modification de fiche jeu',
  'game.delete': 'Suppression de jeu',
  'rating.delete': 'Suppression de note',
  'support.ticket.update': 'Mise à jour de ticket support',
  'system.maintenance': 'Maintenance / action système',
};

/** Normalise pour la table de libellés (ex. `user_suspend` → `user.suspend`). */
export function normalizeAdminActionTypeKey(raw: string): string {
  return raw.trim().replaceAll('_', '.');
}

/**
 * Libellé lisible pour un type d’action (stats ou liste admin).
 * Inconnus : forme légèrement lisible sans inventer de sens métier.
 */
export function formatAdminActionTypeLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const key = normalizeAdminActionTypeKey(trimmed);
  const mapped = ADMIN_ACTION_TYPE_LABELS_FR[key];
  if (mapped) return mapped;

  return key.replaceAll('.', ' › ');
}
