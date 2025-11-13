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


## Monitoring de disponibilité avec UptimeRobot

### Objectif
Surveiller la disponibilité (Up/Down) de l’API Django et du frontend React déployés sur Render, avec vérification automatique toutes les 5 minutes et alertes par email en cas d’incident.

### Prérequis
- Compte gratuit UptimeRobot.
- Adresse email de notification (équipe/ops).

### Services à monitorer
- API Django → endpoint santé: `https://VOTRE_API_RENDER/health/`
  - L’endpoint `/health/` est exposé par l’API (GET 200 JSON `{"status": "ok"}`).
- Frontend React → page d’accueil: `https://VOTRE_FRONTEND_RENDER/`

Remplacez les URLs par vos URLs Render réelles (ex: `https://ludotheque-api.onrender.com/health/` et `https://ludotheque-frontend.onrender.com/` si c’est votre naming).

### Procédure d’installation
1) Création du compte
- Créez un compte gratuit sur UptimeRobot et vérifiez l’adresse email.
- Dans Settings > Alert Contacts, ajoutez l’email de notification de l’équipe.

2) Ajout des monitors HTTP(s)
- Cliquez sur “Add New Monitor”.
- Monitor Type: HTTP(s).
- Friendly Name: `API Django (production)`.
- URL: `https://VOTRE_API_RENDER/health/`.
- Monitoring Interval: 5 minutes (minimum du plan gratuit).
- Alert Contacts: sélectionnez votre email d’équipe.
- Enregistrez.
- Répétez pour `Frontend React (production)` avec l’URL `https://VOTRE_FRONTEND_RENDER/`.

3) Configuration des intervalles et localisations
- Intervalle: 5 minutes (gratuit).
- Localisations multiples: activez si disponible sur votre plan (optionnelle mais recommandée).

### Test de downtime simulé
1) Sur Render, stoppez temporairement un service (par ex. l’API Django).
2) Attendez la détection (peut prendre jusqu’à 5–10 minutes selon l’intervalle et la latence du provider).
3) Vérifiez que vous recevez une alerte email “Down”.
4) Relancez le service sur Render.
5) Vérifiez la notification “Up” de retour à la normale.

### Vérification du dashboard UptimeRobot
- Accédez au dashboard: les deux monitors doivent apparaître avec leur statut (Up/Down) et leur temps de réponse.
- Ouvrez les logs d’historique: vous devez voir les checks réussis et l’incident simulé (Down → Up).

### Procédure pour ajouter un nouveau monitor
1) Identifiez une URL “health” ou une page publique fiable pour le service.
2) Ajoutez un monitor HTTP(s) avec:
   - Friendly Name clair (service + environnement).
   - URL complète.
   - Intervalle 5 minutes.
   - Contacts d’alerte.
3) Simulez un downtime contrôlé si possible pour valider l’alerte.
4) Documentez le nouveau monitor dans cette section (service, URL, responsable).

### Exemples de vérification manuelle
```bash
# API
curl -sS https://VOTRE_API_RENDER/health/ | jq .

# Frontend
curl -I https://VOTRE_FRONTEND_RENDER/
```

### Captures d’écran (à insérer)
- Dashboard global montrant API + Frontend (status Up).
- Détail d’un monitor (graph de réponse + logs).
- Exemple d’email “Down” et “Up”.

### Critères d’acceptation (UptimeRobot)
- Compte UptimeRobot créé et email de notification configuré.
- Monitor HTTP créé pour l’API Django (`/health/`).
- Monitor HTTP créé pour le frontend React (`/`).
- Vérification automatique toutes les 5 minutes.
- Test de downtime simulé et alerte reçue.
- Dashboard vérifié (statuts + logs) et documenté ici.
