export const hi = (u: string | null) =>
  u ? u.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p') : '';

export const fdate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '';

export function buildPlayerLabel(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (max === 1) return 'Solo';
  if (min != null && max != null && min !== max) return `${min}–${max} joueurs`;
  if (max != null && max > 1) return `jusqu'à ${max} joueurs`;
  return null;
}
