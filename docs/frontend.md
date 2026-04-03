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
