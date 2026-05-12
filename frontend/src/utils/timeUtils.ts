/**
 * Formate un temps de jeu donné en heures (float) vers un format plus lisible.
 * - Moins d'une heure : "XXmin" (ex: "45min")
 * - Une heure ou plus : "XhXX" (ex: "1h05", "10h30")
 *
 * @param hours Temps de jeu en heures
 * @returns Chaîne formatée
 */
export const formatPlaytime = (hours: number | null | undefined): string => {
  if (!hours || hours <= 0) return '0min';

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h < 1) {
    return `${m}min`;
  }

  const minutesStr = m < 10 ? `0${m}` : `${m}`;
  return `${h}h${minutesStr}`;
};
