import * as Sentry from '@sentry/react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import { useEffect } from 'react';

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
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? (import.meta.env.PROD ? 0.1 : 1.0)
    ),
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    // enabled: import.meta.env.PROD || !!import.meta.env.VITE_SENTRY_ENABLE_IN_DEV,
    enabled: true,
    beforeSend(event) {
      return event;
    },
  });
}

export const reportError = (err: unknown, extra?: Record<string, unknown>) =>
  Sentry.captureException(err, extra ? { extra } : undefined);

export const reportMessage = (
  msg: string,
  level: Sentry.SeverityLevel = 'info',
  extra?: Record<string, unknown>
) => Sentry.captureMessage(msg, { level, extra });

export const setUser = (user?: { id?: string; username?: string }) => Sentry.setUser(user ?? null);

export { Sentry };