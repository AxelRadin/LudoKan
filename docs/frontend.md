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
