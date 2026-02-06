## Monitoring & Alertes

### 1. Monitoring Frontend — Sentry

#### Objectif
Centraliser et surveiller les erreurs JavaScript et la navigation sur le frontend React.

#### 1.1 Création du projet
- Créer un projet Sentry nommé `ludotheque-frontend` (type : React).
- Récupérer le DSN du projet.

#### 1.2 Dépendances
- Déjà présentes:
  - `@sentry/react` (SDK officiel React)
- Ajoutées:
  - `react-router-dom` (v6) pour tracer la navigation
- Installation (si besoin):

```bash
cd frontend
npm install
```

#### 1.3 Configuration Sentry
- Configuration effectuée dans `frontend/src/main.tsx`.
- Initialisation avec intégration React Router v6.
- Variables d’environnement préfixées `VITE_`.

#### 1.4 Variables d’environnement
- Fichier `frontend/env.example`:

```env
VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=development
VITE_SENTRY_TRACES_SAMPLE_RATE=1.0
```

- Création du fichier `.env` à partir de l’exemple:

```bash
cd frontend
cp env.example .env
# Renseigner VITE_SENTRY_DSN avec le DSN du projet Sentry
```

#### 1.5 Test d’erreur
- Exemple de bouton de test:

```tsx
<button onClick={() => { throw new Error('Test Sentry Frontend'); }}>
  Test Sentry
</button>
```

- Ou utiliser la page dédiée `frontend/src/pages/TestSentry.tsx` (route `/test`).
- Cliquer sur “Test Sentry” et vérifier l’événement dans le projet `ludotheque-frontend`.

#### 1.6 Bonnes pratiques
- Ne jamais logguer de données sensibles (PII).
- Réduire `VITE_SENTRY_TRACES_SAMPLE_RATE` en production (ex. `0.1`).
- Utiliser `VITE_SENTRY_ENVIRONMENT` (`development`, `staging`, `production`) pour filtrer les événements.

#### Critères de validation
- Projet `ludotheque-frontend` créé.
- Sentry initialisé et opérationnel.
- Erreur de test visible dans Sentry.
- Variables d’environnement configurées.
- Tracing de navigation via React Router fonctionnel.

---

### 2. Alertes & Notifications — Discord

#### Objectif
Centraliser toutes les alertes de production dans un canal Discord `#alert-prod`:
- Erreurs critiques Sentry (backend & frontend)
- Downtime / rétablissement UptimeRobot
- Builds & déploiements Render
- Alertes e-mail diverses (via Gmail + Zapier)

Cette approche remplace la liste de diffusion e-mail initialement prévue.

#### 2.1 Architecture
- Sentry → Discord (intégration ou webhook)
- UptimeRobot → Discord (alert contact)
- Render (emails) → Gmail → Zapier → Discord
- Autres alertes → Gmail → Zapier → Discord

#### 2.2 Prérequis
- Canal Discord `#alert-prod` créé.
- Webhook Discord configuré: Server Settings → Integrations → Webhooks → New Webhook → Channel: `#alert-prod`.
- Accès aux comptes:
  - Sentry (`ludotheque-backend`, `ludotheque-frontend`)
  - UptimeRobot (moniteurs API / frontend)
  - Gmail (adresse projet) + Zapier (workspace)

#### 2.3 Sentry → Discord
1) Sentry → Settings → Integrations → Discord → autoriser le serveur.
2) Project → Alerts → Create Alert → Issue Alert.
3) Conditions:
   - If: level = Error ou Fatal
   - And: > 5 occurrences en 10 minutes
   - Filter: environment = production
4) Action:
   - Envoyer une notification vers Discord `#alert-prod`
   - Fréquence: au plus une fois toutes les 5 minutes

Tests:
- Frontend: utiliser le bouton de test ou la page `/test`.
- Backend (Django shell):

```bash
cd backend
python manage.py shell
```

```python
import sentry_sdk
sentry_sdk.capture_exception(Exception("Test Sentry Backend"))
```

#### 2.4 UptimeRobot → Discord
1) My Settings → Alert Contacts → Add New → Type: Discord
2) Coller le Webhook Discord et nommer (ex. `Discord alert-prod`).
3) Dans Monitors → Edit:
   - Attacher `Discord alert-prod`
   - Notifier sur Down et Up
   - Seuil: downtime ≥ 1 minute (ou selon la fréquence de check)
4) Tester via “Send test notification” et/ou provoquer un court downtime (> 1 min).

Bonnes pratiques:
- 1 moniteur par composant critique (API, frontend, health endpoint).

#### 2.5 Render → Gmail → Zapier → Discord
- Render: activer les notifications e-mail vers l’adresse Gmail du projet.
- Gmail: créer un filtre (ex.: `from:notify@render.com OR from:noreply@render.com subject:(build OR deploy OR failed)`) et appliquer le label `render-notif`.
- (Optionnel) Rediriger les alertes reçues sur l’adresse perso vers la boîte projet.
- Zapier:
  - Zap 1 — Render:
    - Trigger: Gmail — New Email Matching Search (ex. `label:render-notif newer_than:1d`)
    - Action: Discord — Send Channel Message (ou Webhook POST)
    - Message: inclure `From`, `Subject`, snippet/lien
  - Zap 2 — Alertes génériques (optionnel):
    - Trigger: Gmail — `label:alerts`
    - Action: Discord — Send Channel Message

Tests:
- Envoyer un e-mail test ou déclencher un déploiement Render.
- Vérifier la notification dans Discord.

#### 2.6 Seuils recommandés

| Service     | Type           | Seuil                          |
|-------------|----------------|--------------------------------|
| Sentry      | Fatal/Critical | 1 événement → alerte immédiate |
| Sentry      | Error          | > 5 événements / 10 min        |
| UptimeRobot | Downtime       | ≥ 1 minute                     |
| UptimeRobot | Intervalle     | 1–5 min selon criticité        |

#### 2.7 Maintenance
- Accès: gérer les membres via les permissions du canal Discord.
- Rotation de secrets: régénérer les webhooks si fuite/rotation, mettre à jour dans Sentry / UptimeRobot / Zapier.
- Nouveaux services: privilégier une intégration Webhook directe ; sinon passer par Gmail → Zapier → Discord.

#### Validation
- Alertes Sentry: test d’erreur → message reçu.
- Alertes UptimeRobot: test de downtime → “Down/Up” reçus.
- Alertes Render: notification build/déploiement → message reçu.

#### Critères d’acceptation
- Intégrations Sentry, UptimeRobot et Render vers Discord opérationnelles.
- Seuils d’alerte configurés.
- Tests effectués et validés (réception sur `#alert-prod`).
- Redirection e-mail fonctionnelle si utilisée.