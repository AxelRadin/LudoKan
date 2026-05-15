/** Relative time string (e.g. "il y a 3 min") aligned with NotificationList pattern. */
export function relativeTimeFromNow(value: string, lang: string): string {
  const date = new Date(value);
  const now = Date.now();
  const deltaSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  // Thresholds in seconds: [limit, divisor, unit]
  const thresholds: Array<[number, number, Intl.RelativeTimeFormatUnit]> = [
    [60, 1, 'second'],
    [3600, 60, 'minute'],
    [86400, 3600, 'hour'],
    [604800, 86400, 'day'],
  ];

  for (const [limit, divisor, unit] of thresholds) {
    if (abs < limit) {
      return rtf.format(Math.round(deltaSeconds / divisor), unit);
    }
  }

  return date.toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
  });
}
