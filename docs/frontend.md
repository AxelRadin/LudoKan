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
