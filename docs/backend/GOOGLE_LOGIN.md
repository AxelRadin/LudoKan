# Connexion Google — récapitulatif d’implémentation

Ce document décrit la **connexion / inscription via Google OAuth 2.0** (flux **Authorization Code**) dans LudoKan : redirection navigateur vers Google, retour sur le frontend avec un **`code`**, puis échange côté API Django (**dj-rest-auth** + **django-allauth**) pour établir la session applicative (**JWT en cookies**, comme le reste de l’auth).

Le login **email / mot de passe** reste protégé par **reCAPTCHA** (voir [RECAPTCHA.md](./RECAPTCHA.md)) ; le flux Google **ne passe pas** par `POST /api/auth/login/` ni par `RecaptchaLoginView`.

---

## Principe (séquence)

1. L’utilisateur clique sur l’icône Google (connexion ou inscription) : le frontend appelle **`startGoogleLogin()`** (`frontend/src/auth/googleOAuth.ts`), qui redirige vers  
   `https://accounts.google.com/o/oauth2/v2/auth` avec **`client_id`**, **`redirect_uri`**, **`response_type=code`**, scopes **`openid email profile`**, etc.
2. Après consentement, Google redirige vers **`VITE_GOOGLE_REDIRECT_URI`** (ex. `http://localhost:5173/auth/google/callback`) avec **`?code=...`** (ou **`?error=...`**).
3. La page **`GoogleCallbackPage`** lit le `code` et envoie **`POST /api/auth/google/`** avec le corps JSON **`{ "code": "<code>" }`**, **`credentials: 'include'`** et les en-têtes gérés par **`frontend/src/services/api.ts`** (dont **CSRF** si cookie présent).
4. Le backend (**`GoogleLoginView`**, sous-classe de **`SocialLoginView`** dj-rest-auth) échange le code avec Google, crée ou rattache le compte **django-allauth**, puis renvoie les **cookies JWT** (configuration **`REST_AUTH`** / **`JWTCookieAuthentication`**).

Les valeurs **`redirect_uri` (front)** et **`GOOGLE_CALLBACK_URL` (back)** doivent être **strictement identiques** à une **URI de redirection autorisée** du client OAuth dans [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

---

## Variables d’environnement

### Frontend (`frontend/.env` — lu par Vite)

| Variable | Rôle |
|----------|------|
| **`VITE_GOOGLE_CLIENT_ID`** | **Client ID** OAuth (identifiant public de l’application « Web » dans Google Cloud). Utilisé uniquement pour construire l’URL d’autorisation. |
| **`VITE_GOOGLE_REDIRECT_URI`** | URL exacte de retour après Google (ex. `http://localhost:5173/auth/google/callback`). **Doit** correspondre à la console Google et au **`GOOGLE_CALLBACK_URL`** backend. |

Après modification : **redémarrer** le serveur de dev Vite (`npm run dev`).

### Backend (`.env` à la racine du monorepo ou selon votre déploiement)

| Variable | Rôle |
|----------|------|
| **`GOOGLE_CLIENT_ID`** | Même identifiant client que côté front (utilisé par **django-allauth** pour l’app Google dans `SOCIALACCOUNT_PROVIDERS`). |
| **`GOOGLE_CLIENT_SECRET`** | **Secret client** — uniquement serveur, **jamais** dans le frontend ni dans le dépôt. |
| **`GOOGLE_CALLBACK_URL`** | Même URL que **`VITE_GOOGLE_REDIRECT_URI`** (défaut possible dans `settings.py` : `http://localhost:5173/auth/google/callback`). Sert de **`callback_url`** dans **`GoogleLoginView`** pour l’échange du code. |

Redémarrer le processus Django / conteneur **`web`** après changement.

---

## Google Cloud Console (résumé)

1. Créer ou ouvrir un projet → **APIs et services** → **Identifiants**.
2. **Créer des identifiants** → **ID client OAuth** → type **Application Web** (ou adapté à votre hébergement).
3. **URI de redirection autorisées** : ajouter exactement la valeur de **`VITE_GOOGLE_REDIRECT_URI`** / **`GOOGLE_CALLBACK_URL`** (y compris `http` vs `https`, port, chemin `/auth/google/callback`).
4. **Origines JavaScript autorisées** : origine du front (ex. `http://localhost:5173`) si la console l’exige pour votre type de client.
5. Récupérer **ID client** et **Secret client** → les mapper aux variables ci-dessus.

Documentation Google : [Utilisation OAuth 2.0 pour les applications Web serveur](https://developers.google.com/identity/protocols/oauth2/web-server).

---

## Endpoints et fichiers utiles

| Élément | Emplacement / détail |
|---------|----------------------|
| **POST** échange code | **`/api/auth/google/`** — `GoogleLoginView` (`backend/apps/users/views_social.py`), route dans `backend/apps/users/urls_auth.py`. |
| Config provider | `backend/config/settings.py` — **`allauth.socialaccount.providers.google`**, bloc **`SOCIALACCOUNT_PROVIDERS["google"]`**. |
| Redirection OAuth | `frontend/src/auth/googleOAuth.ts` — **`startGoogleLogin()`**. |
| Callback UI | `frontend/src/pages/GoogleCallbackPage.tsx`, route **`auth/google/callback`** dans `frontend/src/main.tsx`. |
| Base API / cookies | `frontend/src/services/api.ts` — **`VITE_API_BASE_URL`**, `credentials: 'include'`, CSRF. |

Référence dj-rest-auth (flux Google, `code` ou token) : [Installation — Google](https://dj-rest-auth.readthedocs.io/en/5.0.0/installation.html#google).

---

## Vérifications manuelles (dev)

1. Variables front et back renseignées, **même** redirect URI partout (Google Console + `VITE_GOOGLE_REDIRECT_URI` + `GOOGLE_CALLBACK_URL`).
2. **`CORS_ALLOWED_ORIGINS`** / **`CSRF_TRUSTED_ORIGINS`** incluent l’origine du front (déjà nécessaire pour le login classique).
3. Clic Google → retour sur `/auth/google/callback` avec `code` → **POST** réussi → redirection accueil, utilisateur authentifié (**cookies** visibles dans l’onglet Réseau).

---

## Dépannage

| Symptôme | Piste |
|----------|--------|
| **`redirect_uri_mismatch`** (Google) | L’URI dans la barre d’adresse après redirection ne correspond pas à celle enregistrée dans Google Cloud (protocole, port, chemin). |
| **`invalid_grant`** / échec échange de code | URL de callback backend différente du front ; code déjà consomé ou expiré ; horloge serveur très décalée. |
| **400 / CSRF** sur **`POST /api/auth/google/`** | Cookie **`csrftoken`** lisible par le front, même site que l’API ; vérifier **`CSRF_TRUSTED_ORIGINS`**. |
| **Secret / client_id refusés** | **`GOOGLE_CLIENT_SECRET`** et **`GOOGLE_CLIENT_ID`** alignés sur le **même** client OAuth que **`VITE_GOOGLE_CLIENT_ID`**. |
| **Variables front ignorées** | Elles doivent être dans **`frontend/.env`** avec le préfixe **`VITE_`**, pas seulement dans le `.env` racine. |

Si vous activez **PKCE** côté allauth (`OAUTH_PKCE_ENABLED`) et rencontrez des erreurs avec un flux « code » issu uniquement du navigateur sans `code_challenge`, consultez la doc **django-allauth** pour ce provider ou testez sans PKCE en environnement contrôlé.

---

## Sécurité

- Ne **jamais** commiter **`GOOGLE_CLIENT_SECRET`** ni remplir les `.env` réels dans le dépôt ; utiliser **`.env.example`** / **`frontend/.env.example`** en placeholders.
- Le **`VITE_GOOGLE_CLIENT_ID`** est public par nature ; la sécurité repose sur le **secret serveur**, les **redirect URIs** restrictives, et la validation du **code** côté backend.
