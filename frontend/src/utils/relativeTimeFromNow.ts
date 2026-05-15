/** Relative time string (e.g. "il y a 3 min") aligned with NotificationList pattern. */
export function relativeTimeFromNow(value: string, lang: string): string {
  const date = new Date(value);
  const now = Date.now();
  const deltaSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  if (abs < 60) return rtf.format(deltaSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(deltaSeconds / 86400), 'day');
  return new Date(value).toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
  });
}
