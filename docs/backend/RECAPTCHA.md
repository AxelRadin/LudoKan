# reCAPTCHA — récapitulatif d’implémentation

Ce document décrit la protection **Google reCAPTCHA** sur le **flux de connexion** tel qu’implémenté dans le dépôt (vue **`RecaptchaLoginView`**, vérif **`verify_recaptcha`**, widget **`react-google-recaptcha`**). Une première version historique est visible sur la branche **`feat/KAN-76-reCAPTCHA`** (commit **`089f85bd486d19fe9d6c2c7978603b2141705081`**, *« add reCAPTCHA »*) ; le code actuel inclut entre autres **`RECAPTCHA_SEND_REMOTEIP`**, logs structurés et retrait de **`recaptcha_token`** avant **`super().post()`**.

---

## Principe

1. Le **frontend** affiche le widget reCAPTCHA v2 case à cocher (clé **site** `VITE_RECAPTCHA_SITE_KEY`) et obtient un **jeton** après validation utilisateur.
2. Lors du **`POST /api/auth/login/`** (dj-rest-auth, auth par **email**), le jeton est envoyé avec **`email`** et **`password`** sous le nom **`recaptcha_token`**.
3. Le **backend** vérifie le jeton auprès de Google (`siteverify`) avec **`RECAPTCHA_SECRET_KEY`**. Si la vérification échoue ou si le jeton est absent, la requête est rejetée **avant** **`LoginView`** (dj-rest-auth). Après succès, **`recaptcha_token`** est retiré du corps parsé puis **`super().post()`** exécute le login habituel.

---

## Variables d’environnement

| Variable | Où | Rôle |
|----------|-----|------|
| `RECAPTCHA_SECRET_KEY` | Backend (`.env` racine pour Docker, `backend/env_template.txt`, `.env.example`) | Clé **secrète** Google — **jamais** exposée au client. |
| `RECAPTCHA_SEND_REMOTEIP` | Backend (même emplacement) | **`false`** par défaut : n’envoie pas **`remoteip`** à Google (évite souvent **`invalid-input-response`** sous Docker). **`true`** uniquement derrière un proxy qui fournit une IP client **fiable** (voir section dépannage). |
| `VITE_RECAPTCHA_SITE_KEY` | **`frontend/.env`** (Vite ne lit pas le `.env` à la racine du monorepo) | Clé **site** (publique) pour le widget. |

Après modification des variables dans **`.env`**, **redémarrer** le conteneur / process backend pour recharger la configuration.

**Obtenir les clés :** [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) — enregistrer le domaine du front (ex. `localhost` en dev).

### Trois enregistrements Google (recommandé équipe)

Si tu sépares **dev local**, **staging** et **prod** (option « site Dev / local » dédié) :

| Enregistrement Google | Domaines typiques | Variables sur cet env |
|------------------------|-------------------|------------------------|
| **Dev / local** | `localhost`, `127.0.0.1` (et variante si besoin) | `.env` local uniquement : paire **dev** |
| **Staging** | hostname de préproduction | secrets staging (CI / hébergeur) |
| **Production** | domaine réel | secrets prod |

Chaque site dans la console a **sa propre** paire clé site + clé secrète : en local, mets bien la paire du site **Dev**, pas celle du staging ni de la prod. Ne commite jamais les vraies clés ; les templates (`.env.example`) restent en placeholders.

---

## Backend (Django)

### Configuration

- **`backend/config/settings.py`** :

  ```python
  RECAPTCHA_SECRET_KEY = config("RECAPTCHA_SECRET_KEY", default="")
  RECAPTCHA_SEND_REMOTEIP = config("RECAPTCHA_SEND_REMOTEIP", default=False, cast=bool)
  ```

### Vérification

- **`apps/users/recaptcha.py`** : **`verify_recaptcha(token, *, remote_ip=None)`** — `POST` vers `https://www.google.com/recaptcha/api/siteverify` avec `secret` + `response` ; ajoute **`remoteip`** seulement si **`RECAPTCHA_SEND_REMOTEIP`** est **`true`** et qu’une IP est connue. Timeout **5 s**. Si la clé secrète est vide → refus + log warning. Logs **INFO** (appel, statut HTTP, succès) et **WARNING** (`error-codes` Google, jeton anormalement long **> 2000** car., erreurs réseau).
- **`apps/users/login_views.py`** : **`RecaptchaLoginView(LoginView)`** (`dj_rest_auth.views.LoginView`) :
  - Lit **`recaptcha_token`** dans `request.data`.
  - Absence de jeton → **400**, **`UserErrors.RECAPTCHA_TOKEN_MISSING`**.
  - Vérification KO → **400**, **`UserErrors.RECAPTCHA_INVALID`**.
  - OK → **`_strip_recaptcha_token_from_parsed_body(request)`** puis **`super().post(...)`** (login habituel).

Dépendance HTTP : **`requests`** (`requirements.txt`).

### Logs applicatifs

Le logger **`apps.users`** est configuré dans **`LOGGING`** avec un handler **`console`** (niveau **INFO**) pour le suivi Docker ; détail dans la section *Logs* plus bas.

### Routage

- **`apps/users/urls_auth.py`** : la route **`login/`** est déclarée **avant** `include("dj_rest_auth.urls")` pour remplacer la vue login standard :

  ```python
  path("login/", RecaptchaLoginView.as_view(), name="rest_login"),
  ```

---

## Frontend (React + Vite)

### Dépendances

- **`react-google-recaptcha`** (ex. `^3.1.0`)
- **`@types/react-google-recaptcha`** (TypeScript)

### Comportement (`LoginForm.tsx`)

- **`RECAPTCHA_SITE_KEY`** depuis **`import.meta.env.VITE_RECAPTCHA_SITE_KEY`** (alerte si absent).
- État **`captchaToken`** + **`useRef<ReCAPTCHA>`** pour **`reset()`** après erreur API.
- À la soumission : si pas de token, message *« Veuillez valider le reCAPTCHA. »*.
- **`apiPost('/api/auth/login/', { email, password, recaptcha_token })`** (`frontend/src/services/api.ts`, cookies / CSRF selon le projet).

  ```json
  { "email": "…", "password": "…", "recaptcha_token": "<token>" }
  ```

- En cas de réponse non OK : message d’erreur (ex. **`detail`**), **reset** du widget et du token.

### Typage Vite

**`frontend/src/vite-env.d.ts`** déclare déjà **`VITE_RECAPTCHA_SITE_KEY`** (et les variables Sentry / API) sur **`ImportMetaEnv`**.

---

## Messages d’erreur côté produit

Dans **`backend/apps/users/errors.py`** :

- **`UserErrors.RECAPTCHA_TOKEN_MISSING`** — *« Jeton reCAPTCHA manquant. »* (pas de **`recaptcha_token`** dans le corps).
- **`UserErrors.RECAPTCHA_INVALID`** — *« Validation reCAPTCHA échouée. »* (Google **`success: false`** ou erreur réseau / corps invalide côté **`siteverify`**).

---

## Dépannage (`invalid-input-response`, HTTP 400 sur siteverify)

- **`remoteip`** : l’API Google compare parfois l’IP fournie avec celle du navigateur. Sous **Docker**, `REMOTE_ADDR` / `X-Forwarded-For` peut valoir `172.18.x.x` (réseau pont), ce qui provoque **`invalid-input-response`**. Par défaut **`RECAPTCHA_SEND_REMOTEIP=false`** : on **n’envoie pas** `remoteip` à Google (recommandé en local / Docker). Mettre **`RECAPTCHA_SEND_REMOTEIP=true`** seulement en prod derrière un reverse-proxy qui transmet la **vraie** IP client de façon fiable.
- **Type de clé** : ce backend utilise **`https://www.google.com/recaptcha/api/siteverify`** (reCAPTCHA **v2 « case à cocher »**). Les clés **Enterprise** ou une config **v3 seule** ne correspondent pas à ce flux ; recréer un site **v2 case à cocher** si besoin.

### Serializer de login (`recaptcha_token`)

Après une vérification reCAPTCHA réussie, **`RecaptchaLoginView`** retire **`recaptcha_token`** du payload parsé (`_strip_recaptcha_token_from_parsed_body`) avant **`super().post()`**, pour éviter qu’un futur **LoginSerializer** strict ne rejette un champ inconnu.

### `X-Forwarded-For` et `RECAPTCHA_SEND_REMOTEIP=true`

Sans reverse-proxy de confiance, le client peut envoyer un **`X-Forwarded-For`** arbitraire : la première IP serait alors **usurpée**. En prod, si tu actives **`RECAPTCHA_SEND_REMOTEIP`** :

- Terminer TLS et les requêtes HTTP au **proxy** (nginx, Traefik, Cloudflare, etc.) ;
- Faire en sorte que **seul le proxy** parle à Django, et qu’il **pose** `X-Forwarded-For` / `X-Real-IP` à partir de la connexion réelle (ex. directive nginx du type **`real_ip_module`** + **`set_real_ip_from`** pour ton CDN, ou **`proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`** en amont contrôlé).

Ne pas activer **`RECAPTCHA_SEND_REMOTEIP`** si l’en-tête n’est pas **sous ton contrôle**.

### Logs (`console` vs `system_logs`)

Le logger **`apps.users`** est branché sur **`console`** pour le suivi Docker. Les événements **INFO** de reCAPTCHA ne passent pas par **`SystemLogHandler`** (réservé au logger **`system_logs`**) : c’est voulu pour ne pas **saturer la base** à chaque login.

Pour enregistrer seulement les **échecs** reCAPTCHA en base, tu peux ajouter dans **`LOGGING`** un logger dédié, par exemple **`apps.users.recaptcha`** en niveau **`WARNING`**, avec le handler **`system_logs`** et **`propagate: true`** (les **INFO** continueront d’aller au parent **`apps.users`** → console).

### Front (`console.log`)

Éviter **`console.log`** avec la réponse de login en prod (tokens / données utilisateur). En dev, tu peux utiliser par exemple **`import.meta.env.DEV`** pour un log optionnel.

---

## Tests et exploitation

- **Tests pytest (`apps/users/tests`)** : fixture **`autouse`** qui mocke **`apps.users.recaptcha.verify_recaptcha`** ; constante **`RECAPTCHA_POST_FIELD`** (`recaptcha_token` factice) dans les **`POST /api/auth/login/`** ; scénarios jeton manquant / vérif refusée dans **`test_views.py`**.
- **Dev :** clés Google pour domaines **`localhost`** / **127.0.0.1** (site « dev » dédié ou staging avec ces domaines).
- **CI :** le mock évite les appels réseau ; pas besoin d’une vraie **`RECAPTCHA_SECRET_KEY`** dans l’environnement de test pour les tests users concernés.
- **Prod :** clé site alignée sur le domaine réel ; clé secrète uniquement côté serveur ; redémarrage des services après rotation des secrets.

---

## Références Git

- Branche : **`feat/KAN-76-reCAPTCHA`**
- Commit d’implémentation : **`089f85bd486d19fe9d6c2c7978603b2141705081`** — *add reCAPTCHA*

Pour l’historique ticket : `git show 089f85b -- …`. Fichiers utiles aujourd’hui : **`apps/users/recaptcha.py`**, **`apps/users/login_views.py`**, **`apps/users/urls_auth.py`**, **`config/settings.py`** (variables + **`LOGGING`**), **`apps/users/errors.py`**, **`frontend/src/components/LoginForm.tsx`**, **`frontend/src/services/api.ts`**, **`frontend/src/vite-env.d.ts`**.
