import { useCallback, useEffect, useState } from 'react';

export const COOKIE_KEY = 'ludokan_cookie_consent';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  personnalisation: boolean;
}

export const defaultPrefs: CookiePreferences = {
  necessary: true,
  analytics: false,
  personnalisation: false,
};

export function getStoredConsent(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(COOKIE_KEY);
    return raw ? (JSON.parse(raw) as CookiePreferences) : null;
  } catch {
    return null;
  }
}

export function saveConsent(prefs: Omit<CookiePreferences, 'necessary'>): void {
  const full: CookiePreferences = { ...prefs, necessary: true };
  localStorage.setItem(COOKIE_KEY, JSON.stringify(full));
  globalThis.dispatchEvent(
    new CustomEvent('cookieconsentchange', { detail: full })
  );
}

export function useCookieConsent() {
  const [prefs, setPrefs] = useState<CookiePreferences>(
    () => getStoredConsent() ?? defaultPrefs
  );
  const [hasChosen, setHasChosen] = useState(() => getStoredConsent() !== null);

  useEffect(() => {
    const onchange = (e: Event) => {
      const detail = (e as CustomEvent<CookiePreferences>).detail;
      setPrefs(detail);
      setHasChosen(true);
    };
    globalThis.addEventListener('cookieconsentchange', onchange);
    return () =>
      globalThis.removeEventListener('cookieconsentchange', onchange);
  }, []);

  const updatePrefs = useCallback(
    (next: Omit<CookiePreferences, 'necessary'>) => saveConsent(next),
    []
  );

  return { prefs, updatePrefs, hasChosen };
}
