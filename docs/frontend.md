# Documentation Frontend

## ReviewForm

Composant de rédaction d'avis utilisateur sur un jeu.

### Fichiers

- `src/components/ReviewForm.tsx` — composant formulaire
- `src/hooks/useSubmitReview.ts` — hook de soumission API

### Règles de validation

| Champ     | Règle       | Message d'erreur                                  |
|-----------|-------------|---------------------------------------------------|
| `content` | required    | L'avis est obligatoire.                           |
| `content` | minLength 10 | L'avis doit contenir au moins 10 caractères.     |
| `content` | maxLength 500 | L'avis ne peut pas dépasser 500 caractères.     |

### Endpoints utilisés

| Méthode | Endpoint                  | Description                        |
|---------|---------------------------|------------------------------------|
| POST    | `/api/reviews/`           | Créer un nouvel avis               |
| PATCH   | `/api/reviews/:id/`       | Mettre à jour un avis existant     |

### Exemples de payload

**Créer un avis :**
```json
POST /api/reviews/
{
  "game": "42",
  "content": "Un jeu incroyable, je recommande vivement !"
}
```

**Mettre à jour un avis :**
```json
PATCH /api/reviews/7/
{
  "game": "42",
  "content": "Après réflexion, le jeu est encore meilleur que prévu."
}
```

### Props du composant

| Prop               | Type       | Obligatoire | Description                              |
|--------------------|------------|-------------|------------------------------------------|
| `gameId`           | string     | Oui         | ID Django du jeu                         |
| `existingReviewId` | number     | Non         | ID de l'avis existant (mode édition)     |
| `existingContent`  | string     | Non         | Contenu pré-rempli (mode édition)        |
| `onSuccess`        | function   | Non         | Callback appelé après soumission réussie |

### Comportement non connecté

Si l'utilisateur n'est pas authentifié, le formulaire est remplacé par le message :
> "Connectez-vous pour écrire un avis."

---

## Suppression d'un jeu de la ludothèque

### Fichiers concernés

- `src/components/GameList.tsx` — rendu des cartes jeux avec bouton "Retirer"
- `src/components/ConfirmModal.tsx` — modal de confirmation réutilisable
- `src/pages/ProfilePage.tsx` — logique de suppression, undo, et gestion des erreurs
- `src/api/userGames.ts` — appel API DELETE

### Endpoint

| Méthode | Endpoint                      | Description                          |
|---------|-------------------------------|--------------------------------------|
| DELETE  | `/api/me/games/{game_id}/`    | Retire un jeu de la ludothèque       |

### Exemple de requête DELETE

```http
DELETE /api/me/games/42/
Authorization: Cookie <session>
```

Réponse attendue : `204 No Content`

### Composant `ConfirmModal`

Composant générique de confirmation avant action destructive.

**Props :**

| Prop            | Type       | Obligatoire | Description                            |
|-----------------|------------|-------------|----------------------------------------|
| `open`          | boolean    | Oui         | Contrôle l'affichage du modal          |
| `title`         | string     | Oui         | Titre affiché dans le modal            |
| `message`       | string     | Oui         | Message de confirmation                |
| `confirmLabel`  | string     | Non         | Libellé du bouton confirmer (défaut : "Confirmer") |
| `cancelLabel`   | string     | Non         | Libellé du bouton annuler (défaut : "Annuler")     |
| `onConfirm`     | function   | Oui         | Callback déclenché à la confirmation   |
| `onCancel`      | function   | Oui         | Callback déclenché à l'annulation      |

**Exemple d'utilisation :**

```tsx
<ConfirmModal
  open={modalOpen}
  title="Confirmer la suppression"
  message="Voulez-vous vraiment retirer ce jeu de votre ludothèque ?"
  confirmLabel="Retirer"
  onConfirm={handleConfirm}
  onCancel={() => setModalOpen(false)}
/>
```

### Gestion de l'action "Undo"

La suppression est **optimiste** : le jeu est retiré de la liste immédiatement, avant même la réponse de l'API.

Un toast s'affiche pendant **5 secondes** avec un bouton "Annuler" :

- Si l'utilisateur clique **"Annuler"** → le jeu est réinséré à sa position d'origine, l'appel API est ignoré.
- Si le timer expire → la suppression est définitive.
- Si l'**API renvoie une erreur** → le jeu est automatiquement restauré et un toast d'erreur s'affiche : _"Impossible de retirer le jeu. Réessayez plus tard."_
## Édition et suppression d'un avis (FRONT-008D)

### Fichiers concernés

- `src/components/reviews/ReviewCard.tsx` — carte d'avis avec détection du propriétaire
- `src/components/reviews/ReviewSection.tsx` — orchestration édition/suppression
- `src/components/reviews/ReviewForm.tsx` — formulaire réutilisé en mode édition

### Badge "Mon avis"

`ReviewCard` compare `review.user.id` avec `currentUserId`. Si l'utilisateur est le propriétaire (`isOwner === true`) :
- Un badge **"Mon avis"** est affiché à côté du nom
- Les boutons **Modifier** et **Supprimer** apparaissent dans un menu (3 points)
- La carte reçoit un style visuel distinctif (bordure rose + animation `pulseGlow`)

### Flux d'édition inline

1. L'utilisateur clique sur **Modifier** → `ReviewSection` passe `editingReview` à l'état local
2. `ReviewForm` est rendu avec `initialValues` pré-remplis (titre, contenu, note)
3. À la soumission → appel `PATCH /api/reviews/:id/`
4. En cas de succès → `onSuccess` met à jour l'avis dans la liste locale via `updateReview()`
5. Le clic sur **Annuler** remet `editingReview` à `null`

### Flux de suppression avec confirmation

1. L'utilisateur clique sur **Supprimer** → `setReviewToDelete(id)` ouvre une `Dialog` MUI
2. La modal affiche : *"Supprimer votre avis ?"* avec boutons **Annuler** / **Supprimer**
3. Confirmation → appel `DELETE /api/reviews/:id/`
4. En cas de succès → `removeReview(id)` retire la carte de la liste locale
5. Annulation → `setReviewToDelete(null)` ferme la modal sans action

### Endpoints utilisés

| Méthode | Endpoint              | Description            |
|---------|-----------------------|------------------------|
| PATCH   | `/api/reviews/:id/`   | Mettre à jour son avis |
| DELETE  | `/api/reviews/:id/`   | Supprimer son avis     |

### Exemple de payload PATCH

```json
PATCH /api/reviews/7/
{
  "content": "Finalement un excellent jeu.",
  "title": "Coup de coeur",
  "rating": 5
}
```

---

## Liste des avis sur la fiche jeu (pagination DRF)

### Fichiers

- `src/hooks/useReviews.ts` — chargement initial `page=1`, fusion des pages suivantes, `totalCount`, `hasNext`, `loadMorePage`
- `src/components/reviews/ReviewsList.tsx` — liste, états chargement / vide / erreur, bouton « Charger plus »
- `src/components/reviews/ReviewCard.tsx` — carte d’un avis (auteur, date, texte, note)
- `src/components/reviews/ReviewSection.tsx` — compose formulaire + liste

### Endpoint

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/reviews/?game=<django_id>&page=<n>` | Liste paginée des avis pour un jeu (`PAGE_SIZE` défini côté Django REST, typiquement 10) |
| GET | `/api/reviews/?game=<django_id>&user=<user_id>` | Avis de cet utilisateur pour ce jeu (au plus un) — utilisé sur la fiche jeu pour éviter de rater l’avis connecté quand il n’est pas sur la page 1 de `?game=` |

Réponse paginée (format Django REST Framework) :

```json
{
  "count": 42,
  "next": "http://localhost:8000/api/reviews/?game=5&page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": { "id": 3, "pseudo": "joueur", "username": "joueur", "review_count": 6 },
      "game": 5,
      "content": "Texte de l'avis…",
      "title": "Titre optionnel",
      "rating": { "value": 4 },
      "date_created": "2026-04-20T12:00:00Z"
    }
  ]
}
```

Le hook extrait `pathname` + `query` de `next` pour les requêtes suivantes (compatible `VITE_API_BASE_URL`).

### Retour de `useReviews(gameId)`

| Champ | Type | Description |
|-------|------|-------------|
| `reviews` | `ReviewItem[]` | Tous les avis chargés (pages fusionnées) |
| `totalCount` | `number` | `count` renvoyé par l’API |
| `isLoading` | `boolean` | Premier chargement |
| `isLoadingMore` | `boolean` | Page suivante en cours |
| `error` | `string \| null` | Erreur réseau / API (chargement initial) |
| `loadMoreError` | `string \| null` | Erreur sur « Charger plus » (la liste déjà chargée reste affichée) |
| `hasNext` | `boolean` | Page suivante disponible |
| `loadMorePage` | `() => void` | Charge la page suivante |
| `addReview` / `updateReview` / `removeReview` | — | Mise à jour optimiste locale après création / édition / suppression |
