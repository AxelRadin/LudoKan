export const hi = (u: string | null) =>
  u ? u.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p') : '';

export const fdate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '';
