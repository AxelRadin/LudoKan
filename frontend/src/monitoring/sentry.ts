import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

import { getStoredConsent } from '../hooks/useCookieConsent';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        createRoutesFromChildren,
        matchRoutes,
        useLocation,
        useNavigationType,
      }),
    ],
    tracesSampleRate: Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ??
        (import.meta.env.PROD ? 0.1 : 1)
    ),
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    enabled: true,
    beforeSend(event) {
      return event;
    },
  });
}

function isAnalyticsAllowed(): boolean {
  return getStoredConsent()?.analytics === true;
}

export const reportError = (err: unknown, extra?: Record<string, unknown>) => {
  if (!isAnalyticsAllowed()) return;
  Sentry.captureException(err, extra ? { extra } : undefined);
};

export const reportMessage = (
  msg: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>
) => {
  if (!isAnalyticsAllowed()) return;
  Sentry.captureMessage(msg, { level, extra });
};

export const setUser = (user?: { id?: string; username?: string }) =>
  Sentry.setUser(user ?? null);
