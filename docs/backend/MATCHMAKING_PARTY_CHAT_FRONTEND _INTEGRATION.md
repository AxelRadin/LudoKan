# Guide d’intégration frontend du flow Party / Lobby / Chat

## Objectif

Ce document explique comment intégrer côté frontend le flow **Party / Lobby / Chat** exposé par le backend.

Le but est de permettre à une personne frontend de brancher l’interface sans réimplémenter la logique métier côté client.

Le principe le plus important est le suivant :

> **Le backend est la source de vérité du flow.**  
> Le frontend affiche l’état courant, déclenche les actions utilisateur, et bascule vers le chat quand le backend l’autorise.

---

## Vue d’ensemble du flow

Le cycle de vie d’une party est :

1. `open`
2. `waiting_ready`
3. `waiting_ready_for_chat`
4. `countdown`
5. `chat_active`
6. `cancelled`

Le flow général est :

- un joueur sort de la phase de découverte / matchmaking
- le frontend déclenche l’entrée dans le flow party
- la party recrute en phase `open`
- quand le groupe est verrouillé, les joueurs passent par une validation `ready`
- puis par une validation `ready_for_chat`
- un countdown démarre
- le backend ouvre le chat et renseigne `chat_room_id`
- le frontend bascule vers le chat

---

## Relation entre matchmaking et party

Dans le MVP actuel, le matchmaking et les parties sont **deux briques distinctes** :

- `matchmaking` sert à la découverte / recherche de joueurs
- `party` sert à matérialiser le groupe réel et son cycle de vie jusqu’au chat

### Règle actuelle
Le matchmaking **ne crée pas automatiquement** de `GameParty`.

Le passage entre les deux se fait côté frontend :
- le frontend utilise le flow matchmaking pour découvrir des joueurs / matches
- quand l’utilisateur poursuit vers le lobby, le frontend appelle `POST /api/parties/join-or-create`
- le backend décide alors :
  - soit de créer une nouvelle `GameParty`
  - soit de rattacher l’utilisateur à une `GameParty` `open` existante

### Conséquence
Le frontend joue actuellement le rôle de **pont** entre :
- la phase de découverte (`matchmaking`)
- et la phase de groupe (`party`)

### Important
Le frontend ne décide pas lui-même :
- si une party doit être créée
- ou si une party existante doit être réutilisée

Le frontend exprime seulement :
- “cet utilisateur veut entrer dans le flow party pour ce jeu”

Le backend reste responsable de la décision finale.

---

## Principe d’intégration

Le frontend doit considérer que :

- **`GameParty` est la source de vérité**
- les transitions d’état appartiennent au backend
- les deadlines appartiennent au backend
- `chat_room_id` n’existe que quand le chat est réellement ouvert
- le frontend ne doit pas deviner ni créer un salon lui-même

Le frontend peut :
- lire l’état de la party
- afficher les membres et les validations
- afficher des countdowns locaux à partir des timestamps renvoyés
- appeler les endpoints d’action utilisateur

Le frontend ne doit pas :
- recalculer les transitions métier
- décider seul qu’un chat est ouvert
- fabriquer un `room_id`
- autoriser l’entrée de nouveaux membres quand la party n’est plus en `open`

---

## Endpoints backend disponibles

### Parties
- `POST /api/parties/join-or-create`
- `GET /api/parties/me/active`
- `GET /api/parties/<party_id>`
- `POST /api/parties/<party_id>/ready`
- `POST /api/parties/<party_id>/ready-for-chat`
- `POST /api/parties/<party_id>/leave`

### Chat
À utiliser seulement quand `chat_room_id` est présent dans la party :

- `GET /api/chats/<room_id>/messages`
- `POST /api/chats/<room_id>/messages`
- `WS /ws/chat/<room_id>/`

---

## Contrat fonctionnel côté frontend

Le frontend doit être construit autour de cette règle :

> **On lit la party, on affiche son statut, et on appelle des actions ciblées.**

Le frontend ne pilote pas le flow ; il le **consomme**.

Autre règle importante du MVP :

> **Le frontend fait le pont entre matchmaking et party.**

Concrètement :
- le flow matchmaking sert à la découverte
- quand l’utilisateur poursuit vers le lobby, le frontend appelle `POST /api/parties/join-or-create`
- ensuite le frontend travaille uniquement avec la `party` renvoyée par le backend

---

## Statuts de party et comportement UI attendu

## `open`
### Signification
La party existe et recrute encore.

### Ce que le frontend peut afficher
- état “Recherche de joueurs” / “Formation du groupe”
- liste des membres déjà présents
- nombre de joueurs actuels vs `max_players`
- délai avant clôture du recrutement si `open_deadline_at` est présent

### Ce que l’utilisateur peut faire
- attendre
- éventuellement quitter via `leave` si l’UX le prévoit

### Important
Tant que la party est en `open`, la composition peut encore évoluer.

---

## `waiting_ready`
### Signification
Le groupe est figé.  
Chaque membre doit confirmer :

> “Je reste dans ce groupe”

### Ce que le frontend doit afficher
- liste des membres
- état de validation de chaque membre (`ready_state`)
- deadline `ready_deadline_at`
- bouton d’action “Je suis prêt” / “Confirmer”
- éventuellement état “Refusé / expiré / en attente” si exposé visuellement

### Ce que l’utilisateur peut faire
- envoyer `POST /api/parties/<party_id>/ready`
- quitter via `leave`

### Important
À ce stade, aucun nouveau joueur ne doit être présenté comme rejoignable côté frontend.  
Le groupe est verrouillé.

---

## `waiting_ready_for_chat`
### Signification
Les membres encore retenus dans le flow doivent confirmer :

> “J’accepte l’ouverture du chat”

### Ce que le frontend doit afficher
- membres concernés
- état `ready_for_chat_state`
- deadline `ready_for_chat_deadline_at`
- bouton “Ouvrir le chat” / “J’accepte le chat” / wording produit équivalent

### Ce que l’utilisateur peut faire
- envoyer `POST /api/parties/<party_id>/ready-for-chat`
- quitter via `leave`

### Important
Le frontend ne doit pas considérer que le chat est disponible tant que `chat_room_id` n’existe pas.

---

## `countdown`
### Signification
Toutes les conditions sont remplies ; un countdown final est en cours avant ouverture effective du chat.

### Ce que le frontend doit afficher
- un timer basé sur `countdown_ends_at`
- un message de transition vers le chat
- éventuellement les membres encore présents

### Important
Le frontend peut afficher un countdown local, mais :
- le backend reste la source de vérité
- le chat n’est réellement ouvert que quand `chat_room_id` apparaît
- un GET de la party peut déclencher un lazy-check côté backend si la deadline est dépassée

---

## `chat_active`
### Signification
Le chat est ouvert.

### Ce que le frontend doit faire
- lire `chat_room_id`
- basculer vers la vue chat
- charger l’historique via `GET /api/chats/<room_id>/messages`
- ouvrir le WebSocket `ws/chat/<room_id>/`

### Important
Le passage au chat doit être déclenché par la présence de `chat_room_id`, pas uniquement par le statut affiché localement.

---

## `cancelled`
### Signification
La party n’a pas pu continuer.

Exemples possibles :
- pas assez de joueurs
- expirations
- départs
- validations insuffisantes

### Ce que le frontend doit afficher
- message clair d’annulation
- éventuellement action de retour / relancer recherche
- ne pas tenter d’ouvrir le chat

---

## Données utiles à exploiter dans la réponse party

Le frontend doit exploiter au minimum :

- `id`
- `status`
- `game`
- `max_players`
- `chat_room_id`
- `open_deadline_at`
- `ready_deadline_at`
- `ready_for_chat_deadline_at`
- `countdown_started_at`
- `countdown_ends_at`
- `members`

Pour chaque membre :
- `user_id`
- éventuellement `username` / pseudo
- `membership_status`
- `ready_state`
- `ready_for_chat_state`
- `joined_at`
- `left_at`

---

## Architecture frontend recommandée

Je recommande de séparer quatre responsabilités :

### 1. Gestion du pont matchmaking -> party
Responsable de :
- savoir à quel moment l’utilisateur quitte la phase de découverte
- appeler `POST /api/parties/join-or-create`
- récupérer la `party` renvoyée
- rediriger vers le lobby

### 2. Gestion de la party active
Responsable de :
- lire la party active
- rafraîchir son état
- exposer le statut courant
- exposer les membres et deadlines
- déclencher les actions `ready`, `ready-for-chat`, `leave`

### 3. Gestion de l’écran lobby
Responsable de :
- rendre l’UI selon `party.status`
- afficher les composants adaptés à chaque phase

### 4. Gestion du chat
Responsable de :
- lire `chat_room_id`
- charger les messages
- connecter le WebSocket
- envoyer les messages

---

## Structure frontend recommandée

Exemple de découpage simple :

- `services/matchmaking.ts`
- `services/party.ts`
- `services/chat.ts`
- `hooks/useMatchmakingToParty.ts`
- `hooks/useActiveParty.ts`
- `hooks/usePartyDetail.ts`
- `hooks/usePartyChat.ts`
- `pages/PartyLobbyPage.tsx`
- `components/party/PartyMembersList.tsx`
- `components/party/PartyStatusBanner.tsx`
- `components/party/PartyCountdown.tsx`
- `components/chat/PartyChatPanel.tsx`

Selon la stack, ça peut être :
- React Query
- SWR
- Zustand
- Context API
- Redux

Mais le plus important est la séparation :
- **matchmaking**
- **party**
- **chat**

---

## Recommandation de stratégie de rafraîchissement

Le backend n’expose pas de WebSocket dédié au lobby / party dans ce périmètre.  
Le frontend doit donc s’appuyer sur du **polling**.

### Recommandation MVP
Faire un polling de la party active ou du détail de party.

Exemple de stratégie :
- toutes les 3 à 5 secondes pendant les phases actives :
  - `open`
  - `waiting_ready`
  - `waiting_ready_for_chat`
  - `countdown`
- arrêt du polling quand :
  - `chat_active`
  - `cancelled`
  - ou absence de party active

### Pourquoi
- simple
- robuste
- suffisant pour un MVP
- cohérent avec l’API actuelle

---

## Recommandation de bascule vers le chat

La bascule doit être pilotée comme suit :

1. le frontend poll la party
2. dès que :
   - `status = chat_active`
   - et/ou `chat_room_id` est non nul
3. le frontend change d’écran / panneau
4. le frontend initialise la couche chat

### Règle importante
La présence de `chat_room_id` est le meilleur signal pratique pour savoir que le chat est réellement exploitable.

---

## Recommandation spécifique pour le pont matchmaking -> party

Le frontend doit déclencher `join-or-create` au moment où le produit considère que l’utilisateur quitte la phase de découverte pour entrer dans le lobby.

Exemples possibles selon l’UX produit :
- clic sur “Continuer”
- clic sur “Rejoindre le lobby”
- validation d’un match trouvé
- confirmation après affichage des résultats matchmaking

### Règle d’intégration
À ce moment-là, le frontend appelle :

- `POST /api/parties/join-or-create`

avec le `game` concerné, et éventuellement `max_players` si le produit l’autorise.

Le backend décide ensuite :
- soit de créer une nouvelle party
- soit de rattacher l’utilisateur à une party `open` existante

Le frontend ne doit pas présenter cette décision comme une logique cliente.  
Il doit seulement présenter l’action comme :
- “entrer dans le lobby”
- “continuer”
- “former / rejoindre un groupe”

---

## Comportement recommandé par phase

### En `open`
- afficher “Recherche de joueurs”
- afficher le nombre de membres actuels
- afficher éventuellement la deadline de recrutement
- polling actif

### En `waiting_ready`
- afficher la liste des membres
- afficher le ready de chaque membre
- afficher le bouton d’acceptation pour l’utilisateur courant
- afficher la deadline
- polling actif

### En `waiting_ready_for_chat`
- afficher les membres retenus
- afficher le consentement chat de chacun
- afficher le bouton d’acceptation chat
- afficher la deadline
- polling actif

### En `countdown`
- afficher un timer local
- maintenir le polling
- basculer vers chat dès apparition de `chat_room_id`

### En `chat_active`
- arrêter le polling de lobby si non nécessaire
- entrer dans le flow chat

### En `cancelled`
- arrêter le polling
- afficher un état final clair
- proposer une action produit : retour, relancer, fermer

---

## Cas limites UI à prévoir

### 1. L’utilisateur n’a pas de party active
`GET /api/parties/me/active` peut renvoyer `404`.

UI attendue :
- état “aucune party active”
- possibilité de lancer/rejoindre une nouvelle recherche selon le produit

### 2. La party change d’état pendant que l’écran est ouvert
C’est normal.

Le frontend doit être prêt à voir :
- `open -> waiting_ready`
- `waiting_ready -> waiting_ready_for_chat`
- `waiting_ready_for_chat -> countdown`
- `countdown -> chat_active`
- `* -> cancelled`

L’UI doit réagir à ces changements sans supposer de parcours figé.

### 3. L’utilisateur quitte
Après `leave`, l’utilisateur peut perdre l’accès à la party comme membre du flow.

Conséquence possible :
- un second `leave` côté API peut renvoyer `403`
- le frontend doit considérer qu’après un leave réussi, la party n’est plus pilotable par cet utilisateur

### 4. Le chat n’est pas encore ouvert malgré un countdown local fini
Le frontend doit continuer à lire la party tant que `chat_room_id` n’est pas présent.

### 5. Le backend annule la party
Toujours prévoir un rendu `cancelled`, même si localement l’utilisateur pensait être sur le point d’ouvrir le chat.

### 6. Le matchmaking a trouvé mais aucune party n’existe encore
C’est normal dans le MVP.
Le frontend doit comprendre que :
- le matchmaking ne crée pas automatiquement de party
- c’est l’appel à `join-or-create` qui matérialise l’entrée dans le lobby

---

## Gestion des erreurs recommandée

Le frontend doit prévoir des états d’erreur simples :

- erreur de récupération de la party
- échec du passage matchmaking -> party
- échec de `join-or-create`
- échec de `ready`
- échec de `ready-for-chat`
- échec de `leave`
- erreur d’ouverture / chargement du chat

### UX recommandée
- messages courts
- possibilité de retry
- ne pas bloquer toute l’UI plus que nécessaire

---

## États loading recommandés

### Matchmaking -> party
- spinner ou bouton désactivé pendant l’appel `join-or-create`
- éviter les doubles clics au moment de l’entrée dans le lobby

### Party poll
- premier chargement distinct du simple rafraîchissement
- éviter un spinner plein écran à chaque poll

### Actions `ready` / `ready-for-chat` / `leave`
- désactiver le bouton pendant l’appel
- prévenir le double clic

### Chat
- chargement initial de l’historique distinct de la connexion WebSocket

---

## Services frontend recommandés

## `matchmakingApi`
Fonctions typiques :
- fonctions de découverte / recherche existantes
- récupération des résultats matchmaking

## `partyApi`
Fonctions typiques :
- `joinOrCreateParty(payload)`
- `getMyActiveParty()`
- `getPartyDetail(partyId)`
- `markReady(partyId, accepted = true)`
- `markReadyForChat(partyId, accepted = true)`
- `leaveParty(partyId)`

## `chatApi`
Fonctions typiques :
- `getMessages(roomId, page?)`
- `sendMessage(roomId, content)`
- `connectChatSocket(roomId, token)`

---

## Hook recommandé : `useMatchmakingToParty()`

Pseudo-responsabilité :
- partir du résultat matchmaking
- déclencher `joinOrCreateParty`
- récupérer la party
- rediriger vers la vue lobby

Exemple d’intention :
- `enterLobbyFromMatchmaking(gameId)`
- `joinLobbyAfterMatchFound(...)`

---

## Hook recommandé : `useActiveParty()`

Pseudo-structure possible :

```ts id="e0jxhh"
type PartyStatus =
  | "open"
  | "waiting_ready"
  | "waiting_ready_for_chat"
  | "countdown"
  | "chat_active"
  | "cancelled";

interface UseActivePartyResult {
  party: Party | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  joinOrCreate: (payload: JoinOrCreatePayload) => Promise<void>;
  markReady: (accepted?: boolean) => Promise<void>;
  markReadyForChat: (accepted?: boolean) => Promise<void>;
  leave: () => Promise<void>;
}