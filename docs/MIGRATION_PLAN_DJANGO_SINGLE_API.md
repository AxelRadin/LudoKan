# Plan de migration : tout Django + un seul api.ts

Ce document décrit comment abandonner le serveur Express (`backend/src/server.ts`) et le double client API frontend pour n’avoir **qu’un backend Django** et **un seul client** (`frontend/src/services/api.ts`).

---

## Vue d’ensemble

| Avant | Après |
|-------|--------|
| Backend 1 : Django (port 8000) – auth, library, games, reviews, etc. | **Django seul** (8000) – tout, y compris proxy IGDB |
| Backend 2 : Express (port 3001) – IGDB search, trending, détails, traduction | *(supprimé)* |
| Frontend : `services/api.ts` + `api/apiClient.ts` + `api/backendClient.ts` + `api/userGamesClient.ts` | **Un seul** `services/api.ts` (+ types/helpers dans un module dédié si besoin) |

---

## Phase 1 – Backend Django : proxy IGDB

### 1.1 Token Twitch (OAuth client_credentials)

L’actuel `igdb_client.py` suppose que `IGDB_ACCESS_TOKEN` est déjà défini. Le serveur Express, lui, récupère le token via Twitch OAuth (`client_id` + `client_secret`).

**À faire :**

- Ajouter dans le backend (ex. `apps/games/igdb_client.py` ou un module `apps/games/igdb_token.py`) :
  - Utilisation de `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` pour appeler `https://id.twitch.tv/oauth2/token` (grant_type=client_credentials).
  - Cache du token en mémoire (ou cache Django) avec expiration (ex. `expires_in - 60` secondes).
  - Si `IGDB_ACCESS_TOKEN` est défini en env, l’utiliser en priorité (comportement actuel) ; sinon utiliser le token obtenu via Twitch.
- Documenter dans `docs/backend/ENV_SETUP.md` ou `.env.example` : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, et optionnellement `IGDB_ACCESS_TOKEN` si fourni manuellement.

**Fichiers concernés :**  
`backend/apps/games/igdb_client.py` (ou nouveau fichier dédié token), `docs/backend/ENV_SETUP.md`, `.env` / `env_template.txt`.

### 1.2 Endpoints IGDB à reproduire dans Django

Reprendre la logique actuelle de `backend/src/server.ts` dans des vues Django (ou une seule vue générique + routing). Tous ces endpoints doivent appeler l’API IGDB via `igdb_request` (ou équivalent utilisant le nouveau système de token) et renvoyer du JSON.

| Route Express actuelle | Méthode | Rôle | Emplacement suggéré |
|------------------------|--------|------|----------------------|
| `/api/games` | GET | Liste de jeux (ex. 10 derniers) | `apps/games/views_igdb.py` |
| `/api/trending` | GET | Jeux tendances (sort, limit, genre) | idem |
| `/api/search` | GET | Recherche IGDB (q, limit, suggest) | idem |
| `/api/games/<id>` | GET | Détail d’un jeu par ID IGDB | idem (ou réutiliser/étendre l’existant si déjà par igdb_id) |
| `/api/collection/<id>/games` | GET | Jeux d’une collection | idem |
| `/api/franchise/<id>/games` | GET | Jeux d’une franchise | idem |
| `/api/franchises` | GET | Recherche franchises/collections (q) | idem |
| `/api/search-page` | GET | Recherche paginée (q, limit, offset) | idem |
| `/api/translate` | POST | Traduction EN→FR (MyMemory) | idem ou `apps/core` si considéré comme service transversal |
| `/api/wikidata-test` | GET | Debug Wikidata (nameEn) | optionnel, à garder uniquement en DEBUG |

**Détails à porter depuis Express :**

- **Wikidata** : enrichissement `display_name` / `name_fr` / `name_en` (requêtes SPARQL, cache TTL 7 jours comme dans Express). À isoler dans un module ex. `apps/games/igdb_wikidata.py` pour garder les vues lisibles.
- **Traduction** : appel à MyMemory (ou autre) pour le texte reçu en POST ; même contrat de réponse que l’actuel Express.
- **Recherche** : normalisation des accents, synonymes FR/EN, mode “suggest” (name ~ + search) comme dans Express. À mettre dans un module ex. `apps/games/igdb_search.py` pour réutilisation.

**Permissions :**  
Pour la plupart des endpoints IGDB (lecture seule), `AllowAny` est suffisant. Pour `POST /api/translate`, décider si réservé aux utilisateurs connectés ou rester en AllowAny selon le besoin produit.

**URLs Django suggérées (préfixe commun) :**

- Inclure dans `apps/games/urls.py` un préfixe du type `igdb/` pour bien séparer du reste :
  - `GET  api/igdb/games/` → liste
  - `GET  api/igdb/trending/` → trending
  - `GET  api/igdb/search/` → search
  - `GET  api/igdb/games/<id>/` → détail par ID IGDB
  - `GET  api/igdb/collections/<id>/games/`
  - `GET  api/igdb/franchises/<id>/games/`
  - `GET  api/igdb/franchises/` (query param `q`) → recherche franchises/collections
  - `GET  api/igdb/search-page/`
  - `POST api/igdb/translate/`
  - (optionnel) `GET api/igdb/wikidata-test/` en DEBUG

**Fichiers à créer/modifier :**

- `backend/apps/games/igdb_client.py` – token Twitch + `igdb_request`
- `backend/apps/games/igdb_wikidata.py` – cache + SPARQL pour noms FR
- `backend/apps/games/igdb_search.py` – normalisation, synonymes, construction des requêtes IGDB (search, suggest, search-page)
- `backend/apps/games/views_igdb.py` – vues (APIView ou @api_view) qui appellent ces modules et renvoient des `Response(data)` JSON
- `backend/apps/games/urls.py` – ajout des routes ci-dessus

### 1.3 CORS

Déjà géré par Django (CORS headers dans `config/settings.py`). Vérifier que l’origine du front (ex. `http://localhost:5173` en dev) est autorisée. Aucun changement nécessaire si le front n’appelle plus que le port 8000.

### 1.4 Tests backend

- Tests unitaires pour le refresh du token Twitch et pour `igdb_request` (mock des réponses HTTP).
- Tests d’intégration (ou de contrat) pour au moins un endpoint IGDB (ex. search ou trending) avec mock de l’API IGDB.
- Conserver ou adapter les tests existants sur `GameByIgdbIdView` et `ImportIgdbGameView`.

---

## Phase 2 – Frontend : un seul client API

### 2.1 Base URL unique

- Le frontend ne doit plus jamais utiliser `http://localhost:3001`.
- Toutes les requêtes passent par la base URL Django :
  - En dev : `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'` (déjà dans `services/api.ts`).
  - Les chemins seront du type `/api/...` (sans hôte), donc `fetch(\`${API_BASE_URL}/api/igdb/search?q=...\`)` etc.

### 2.2 Remplacer les appels apiClient / backendClient / userGamesClient

Pour chaque appel actuel :

- **`api/apiClient.ts`** (fetch vers 3001)  
  → Remplacer par des appels via `services/api.ts` :
  - GET : `apiGet(path)` avec `path` = `/api/igdb/...` (voir tableau Phase 1).
  - POST (ex. translate) : `apiPost(path, body)`.

- **`api/backendClient.ts`** et **`api/userGamesClient.ts`**  
  → Remplacer par `apiGet`, `apiPost`, `apiPatch`, `apiDelete` de `services/api.ts` avec des paths `/api/...` (ex. `/api/me/games/`, `/api/library/...` selon vos urls réelles).

Exemples de mapping (à adapter aux URLs Django exactes) :

| Appel actuel (fichier) | Remplacer par |
|------------------------|----------------|
| `fetch(BACKEND_URL + '/api/games')` (apiClient) | `apiGet('/api/igdb/games/')` |
| `fetch(BACKEND_URL + '/api/search?q=...')` | `apiGet(\`/api/igdb/search/?q=${encodeURIComponent(q)}&limit=...\`)` |
| `fetch(BACKEND_URL + '/api/trending?...')` | `apiGet(\`/api/igdb/trending/?${params}\`)` |
| `fetch(BACKEND_URL + '/api/games/' + id)` | `apiGet(\`/api/igdb/games/${id}/\`)` |
| `fetch(BACKEND_URL + '/api/collection/' + id + '/games?...')` | `apiGet(\`/api/igdb/collections/${id}/games/?...\`)` |
| Idem franchise, franchises, search-page, translate | `apiGet` / `apiPost` vers `/api/igdb/...` |
| `backendClient.get/post/patch/delete(...)` | `apiGet`, `apiPost`, `apiPatch` (et ajouter `apiDelete` dans `services/api.ts` si absent) |
| `userGamesClient.*` | `apiGet('/api/me/games/')`, `apiPost('/api/me/games/', body)`, etc. |

Points importants :

- **CSRF** : `services/api.ts` envoie déjà le cookie CSRF pour les méthodes non GET ; les appels passant par lui en bénéficieront.
- **Credentials** : `credentials: 'include'` est déjà utilisé dans `services/api.ts` ; pas besoin de le dupliquer.

### 2.3 Conserver types et helpers côté frontend

- **Types** : déplacer les types TypeScript (ex. `IgdbGame`, `IgdbCover`, `IgdbPlatform`, etc.) dans un fichier dédié, ex. `frontend/src/types/igdb.ts` (ou garder dans un module `frontend/src/api/igdb.ts` qui n’appelle plus rien, seulement types + helpers).
- **Helpers** : `getCoverUrl`, `formatReleaseDate` restent côté frontend ; les importer depuis ce module de types/helpers au lieu de `apiClient`.
- Ne pas garder de “client” qui fait des `fetch` vers une deuxième base URL : uniquement des types et des helpers purs.

### 2.4 Fichiers à modifier (liste indicative)

- `frontend/src/services/api.ts`  
  - Ajouter `apiDelete` (utilisé par l’actuel `userGamesClient.delete` pour retirer un jeu de la ludothèque).
  - S’assurer que la base URL est bien la seule utilisée pour l’API (déjà le cas si on supprime les autres clients).

- Remplacer les imports et appels dans :
  - `frontend/src/components/GameCard.tsx`
  - `frontend/src/components/GameSearchBar.tsx`
  - `frontend/src/components/SearchBar.tsx`
  - `frontend/src/components/TrendingGames.tsx`
  - `frontend/src/pages/FranchisePage.tsx`
  - `frontend/src/pages/GamePage.tsx`
  - `frontend/src/pages/HomePage.tsx`
  - `frontend/src/pages/LicencePage.tsx`
  - `frontend/src/pages/SearchGamesPage.tsx`
  - `frontend/src/pages/SearchResultsPage.tsx`
  - `frontend/src/pages/SearchWithSuggestionsPage.tsx`
  - `frontend/src/pages/userLibraryPage.tsx`
  - `frontend/src/hooks/useCollectionGames.tsx`
  - `frontend/src/hooks/useFranchiseGames.tsx`
  - `frontend/src/hooks/useGames.tsx`
  - `frontend/src/hooks/useIgdbSearch.tsx`
  - `frontend/src/hooks/useIgdbSuggestions.tsx`
  - `frontend/src/hooks/useSearchGames.tsx`
  - `frontend/src/hooks/useUserGames.tsx`

Pour chaque fichier : remplacer tout appel à `apiClient`, `backendClient`, `userGamesClient` par `apiGet` / `apiPost` / `apiPatch` / `apiDelete` de `services/api.ts`, et importer les types/helpers depuis le nouveau module (ex. `types/igdb.ts`).

### 2.5 Créer un module “igdb” frontend (types + appels via api)

- Créer par exemple `frontend/src/api/igdb.ts` (ou `frontend/src/services/igdb.ts`) qui :
  - Exporte les types (`IgdbGame`, etc.) et les helpers (`getCoverUrl`, `formatReleaseDate`).
  - Exporte des fonctions qui appellent **uniquement** `apiGet` / `apiPost` de `services/api.ts` avec les bons chemins Django (`/api/igdb/...`), par ex. :
    - `searchIgdbGames(q, limit, suggest)`
    - `fetchTrendingGames(sort, limit, genre)`
    - `fetchIgdbGameById(id)`
    - `fetchFranchiseGames(franchiseId, limit, offset)`
    - `searchFranchisesAndCollections(q)`
    - `searchGamesPage(q, limit, offset)`
    - `translateDescription(text)` → `apiPost('/api/igdb/translate/', { text })`
  - Les fonctions qui appellent Django pour “import” ou “library” (ex. `importIgdbGameToDjango`, `addGameToLibrary`) appellent directement `apiPost` depuis ce module (ou depuis les composants) vers `/api/games/igdb-import/`, `/api/me/games/`, etc.

Ensuite, supprimer l’ancien `apiClient.ts` (dont la logique aura été répartie entre `services/api.ts`, `api/igdb.ts` et éventuellement `types/igdb.ts`).

### 2.6 Supprimer les anciens clients et dépendances inutiles

- Supprimer les fichiers :
  - `frontend/src/api/apiClient.ts`
  - `frontend/src/api/backendClient.ts`
  - `frontend/src/api/userGamesClient.ts`
- Si le dossier `frontend/src/api/` ne contient plus que `igdb.ts` (et types), on peut le garder ; sinon renommer/déplacer selon la convention du projet.
- Vérifier qu’aucun import ne pointe plus vers `apiClient`, `backendClient`, `userGamesClient`.

### 2.7 Vite / proxy

- `vite.config.ts` : aujourd’hui seul `/gbapi` est proxifié. Si le front tourne sur un autre port que le backend, les appels iront vers `VITE_API_BASE_URL` (ex. 8000) ; en dev, pas obligatoire de proxy pour l’API si CORS est correct. Si tu préfères tout passer par le même port en dev, ajouter un proxy vers Django (ex. `/api` → `http://localhost:8000`) et utiliser des chemins relatifs `/api/...` dans les appels.

---

## Phase 3 – Suppression du serveur Express

### 3.1 Supprimer le code Node dans le backend

- Supprimer le fichier `backend/src/server.ts`.
- Supprimer `backend/tsconfig.json` (s’il ne sert qu’à ce serveur).
- Supprimer le dossier `backend/src/` s’il est vide.

### 3.2 Nettoyer le root du repo

- **package.json** (racine) : retirer les dépendances utilisées uniquement par le serveur Express (express, axios, cors, dotenv, @types/express, @types/cors, @types/node, ts-node, typescript si plus utilisé nulle part). Garder ce qui sert au monorepo (husky, lint-staged, vite, sentry, etc.).
- **package-lock.json** : régénérer après modification de `package.json` (`npm install`).
- **README / Makefile** : supprimer toute mention du lancement du serveur sur le port 3001 ou des scripts “start backend node”.

### 3.3 Variables d’environnement

- `.env` / `env_template.txt` : retirer les variables spécifiques à l’ancien serveur Node si besoin (ex. `PORT=3001` pour Express).
- Documenter les variables nécessaires à Django pour IGDB : `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, et optionnellement `IGDB_ACCESS_TOKEN` (voir Phase 1.1).

---

## Comment la page détail d’un jeu est créée (jeu pas encore en base)

Quand tu cherches un jeu qui **n’est pas dans la base Django** :

1. **Recherche** : les résultats viennent d’IGDB via le proxy Django (`/api/igdb/search/`). Les `id` sont des **ID IGDB**.
2. **Clic sur un jeu** : le frontend envoie vers une URL du type **`/game/igdb/:igdbId`** (ex. `/game/igdb/12345`).
3. **Page détail** : `GamePage` lit `igdbId` dans l’URL et appelle **`fetchIgdbGameById(igdbId)`** → `GET /api/igdb/games/12345/` → le **proxy Django** interroge IGDB et renvoie les données (nom, résumé, couverture, etc.). Aucun enregistrement dans la table Django `games_game` n’est nécessaire : la page est rendue uniquement à partir de la réponse IGDB.
4. **« Ajouter à la ludothèque »** : à ce moment-là seulement, le frontend appelle :
   - **`importIgdbGameToDjango(igdbId, name, coverUrl, releaseDate)`** → `POST /api/games/igdb-import/` → Django crée (ou récupère) un `Game` avec cet `igdb_id` et renvoie `{ id: djangoId }` ;
   - puis **`addGameToLibrary(djangoId)`** → `POST /api/me/games/` avec `game_id: djangoId` → création du `UserGame` lié à ce jeu.

Donc : **la page détail est « créée »** parce qu’une route utilise l’**ID IGDB** et que les données viennent du **proxy IGDB** (Django), sans avoir besoin d’une ligne dans la table `Game`. Le jeu n’est enregistré en base que lorsqu’on clique sur « Ajouter à la ludothèque ».

---

## Phase 4 – Library (modèle / serializer)

Pour éviter les régressions sur la partie “add to library” et la cohérence avec staging :

- **Option A – Revenir au modèle staging** (**choix retenu** : modèle remis en cohérence avec les migrations 0001–0004 et le serializer) : `UserGame` avec `game` requis, `GameStatus`, `is_favorite`, `date_modified`, `unique_together = ("user", "game")`. Dans ce cas, réverter les changements dans `backend/apps/library/models.py` et les migrations concernées, et s’assurer que “add to library” passe toujours par “importer le jeu en base puis créer le UserGame” (comme aujourd’hui avec `ImportIgdbGameView` + `api/me/games/`).
- **Option B – Valider le nouveau modèle** : si vous gardez `game` nullable, `igdb_game_id`, suppression de `is_favorite`, etc., alors il faut :
  - Mettre à jour **`backend/apps/library/serializers.py`** : champs, `validate_status`, `create`/`update` en cohérence avec le modèle (pas de `is_favorite`, gestion de `igdb_game_id` si vous l’exposez).
  - Créer une **migration** Django pour ces changements et vérifier les tests (unit + intégration) de l’app library et des vues qui s’appuient sur `UserGame`.

Cette phase peut être traitée en parallèle ou juste après la Phase 1, pour que les tests backend passent avant de toucher au frontend.

---

## Ordre recommandé des tâches

1. **Phase 1.1** – Token Twitch dans Django + doc env.
2. **Phase 1.2** – Implémentation des endpoints IGDB dans Django (views + urls + modules igdb_wikidata / igdb_search).
3. **Phase 1.4** – Tests backend (token, un endpoint au moins).
4. **Phase 4** – Aligner modèle Library et serializer (ou revenir au modèle staging).
5. **Phase 2** – Frontend : un seul client, chemins `/api/igdb/...` et `/api/...`, suppression des anciens clients.
6. **Phase 3** – Suppression Express + nettoyage package.json / doc.

Cela permet de ne couper le serveur Express qu’une fois Django et le frontend prêts à ne plus l’utiliser.

---

## Checklist finale

- [ ] Aucun `fetch` ou client ne pointe vers le port 3001.
- [ ] Une seule base URL d’API côté frontend (`VITE_API_BASE_URL` / `services/api.ts`).
- [ ] Tous les appels IGDB passent par Django (`/api/igdb/...`).
- [ ] `backend/src/server.ts` et `backend/tsconfig.json` supprimés.
- [ ] `package.json` racine sans dépendances Express/Node inutiles.
- [ ] Modèle Library et serializer cohérents et testés.
- [ ] Doc env à jour (Twitch / IGDB).
- [ ] Tests automatisés (backend + smoke frontend) verts.
