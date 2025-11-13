## Monitoring Frontend avec Sentry

### Objectif
Centraliser et monitorer les erreurs JavaScript et la navigation côté frontend React.

### 1) Projet Sentry
- Créez un projet Sentry nommé `ludotheque-frontend` (type: React).
- Récupérez le DSN du projet.

### 2) Installation des dépendances
Déjà présent dans le projet:
- **@sentry/react** (SDK Sentry pour React)

Ajouté par cette intégration:
- **react-router-dom** (router v6 pour tracer la navigation)

Installez les dépendances si besoin:

```bash
cd frontend
npm install
```

### 3) Configuration Sentry dans React (Vite + TypeScript)
- Initialisation effectuée dans `frontend/src/main.tsx`.
- Utilise l’intégration officielle React Router v6.
- Variables d’environnement Vite (préfixe `VITE_`).

Extrait clé (déjà en place):

```12:34:frontend/src/main.tsx
import * as Sentry from '@sentry/react';
import { withSentryReactRouterV6Routing, reactRouterV6BrowserTracingIntegration } from '@sentry/react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const createBrowserRouterWithSentry = withSentryReactRouterV6Routing(createBrowserRouter);
const router = createBrowserRouterWithSentry([{ path: '/', element: <App /> }]);

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (SENTRY_DSN && SENTRY_DSN.trim() !== '') {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [reactRouterV6BrowserTracingIntegration({ router })],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 1.0),
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? undefined,
  });
}
```

### 4) Variables d’environnement
Vite nécessite le préfixe `VITE_` pour exposer les variables au client.

- Exemple fourni: `frontend/env.example`
```
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
```

Créez votre fichier `.env` à partir de cet exemple:

```bash
cd frontend
cp env.example .env
# Renseignez VITE_SENTRY_DSN avec le DSN Sentry de ludotheque-frontend
```

### 5) Intégration React Router v6
- La navigation est tracée via `withSentryReactRouterV6Routing` et `reactRouterV6BrowserTracingIntegration`.

### 6) Test d’erreur
Un bouton de test a été ajouté dans `frontend/src/App.tsx`:

```21:31:frontend/src/App.tsx
<button
  onClick={() => {
    throw new Error('Test Sentry Frontend');
  }}
>
  Test Sentry
</button>
```

Ouvrez l’app, cliquez sur “Test Sentry” puis vérifiez que l’événement apparaît dans le projet Sentry `ludotheque-frontend`.

### 7) Bonnes pratiques
- Ne logguez jamais d’informations sensibles (PII) côté frontend.
- Réduisez `VITE_SENTRY_TRACES_SAMPLE_RATE` en production (ex: `0.1`).
- Utilisez `VITE_SENTRY_ENVIRONMENT` (`development`, `staging`, `production`) pour filtrer les événements.

### 8) Critères d’acceptation
- Projet `ludotheque-frontend` créé sur Sentry.
- `@sentry/react` installé (déjà présent).
- Configuration ajoutée et opérationnelle dans l’app (main.tsx).
- Variable `VITE_SENTRY_DSN` définie et utilisée.
- Erreur de test visible sur le dashboard Sentry.
- Intégration React Router v6 fonctionnelle.

