# GiantBomb API – Appels Essentiels

Ce document regroupe les requêtes API indispensables pour interagir avec la base de données GiantBomb.

> **Base URL :**  
> `https://www.giantbomb.com/api/`
>  
> Toutes les requêtes nécessitent :
> - `api_key=YOUR_API_KEY`
> - `format=json`

---

# 1. Paramètres généraux

### Paramètres communs
- **api_key** : votre clé API
- **format** : `json` recommandé
- **limit** : nombre max de résultats (jusqu’à 100)
- **offset** : pagination (0, 100, 200…)
- **filter** : filtrage de champs (genre, plateforme…)
- **sort** : tri par champ
- **field_list** : limiter les champs retournés

---

# 2. Récupérer tous les jeux – `/games/`

### Requête de base (100 jeux)

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100


### Pagination (parcourir toute la base)

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100&offset=0

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100&offset=100

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100&offset=200


### Limiter les champs retournés

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100&field_list=id,name,image,original_release_date

---

# 3. Rechercher un jeu – `/search/`

### Exemple : recherche d’un jeu par nom

https://www.giantbomb.com/api/search/?api_key=YOUR_API_KEY&format=json&query=League%20of%20Legends&resources=game


### Zelda: Twilight Princess

https://www.giantbomb.com/api/search/?api_key=YOUR_API_KEY&format=json&query=The%20Legend%20of%20Zelda%3A%20Twilight%20Princess&resources=game


---

# 4. Détails d’un jeu – `/game/{id}/`

Une fois le GUID d’un jeu obtenu via `/search` ou `/games`, on peut afficher toutes ses infos.

### Exemple :

https://www.giantbomb.com/api/game/3030-21276/?api_key=YOUR_API_KEY&format=json


### Avec champs limités

https://www.giantbomb.com/api/game/3030-21276/?api_key=YOUR_API_KEY&format=json&field_list=id,name,deck,description,image,platforms,genres,original_release_date


---

# 5. Obtenir les plateformes – `/platforms/`

### Liste des plateformes (max 100)

https://www.giantbomb.com/api/platforms/?api_key=YOUR_API_KEY&format=json&limit=100


### Version optimisée

https://www.giantbomb.com/api/platforms/?api_key=YOUR_API_KEY&format=json&limit=100&field_list=id,name,abbreviation


---

# 6. Obtenir les genres – `/genres/`

### Récupérer tous les genres

https://www.giantbomb.com/api/genres/?api_key=YOUR_API_KEY&format=json


### Limiter les champs

https://www.giantbomb.com/api/genres/?api_key=YOUR_API_KEY&format=json&field_list=id,name,deck


---

# 7. Obtenir les compagnies (studios, éditeurs) – `/companies/`

https://www.giantbomb.com/api/companies/?api_key=YOUR_API_KEY&format=json&limit=100


---

# 8. Filtrer les jeux par plateforme

Utilise `filter=platforms:PLATFORM_ID`.

### Exemple :

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100&filter=platforms:157


### Avec champ limités + tri :

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=100&filter=platforms:157&field_list=id,name,image,original_release_date&sort=original_release_date:desc


---

# 9. Trier les jeux

### Trier par date de sortie (plus récents)

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=50&sort=original_release_date:desc


### Trier par nombre de reviews

https://www.giantbomb.com/api/games/?api_key=YOUR_API_KEY&format=json&limit=50&sort=number_of_user_reviews:desc


---

# 10. Résumé rapide des endpoints essentiels

| Fonction | Endpoint |
|---------|-----------|
| Liste des jeux | `/games/` |
| Recherche d’un jeu | `/search/` |
| Détails d’un jeu | `/game/{ID}/` |
| Plateformes | `/platforms/` |
| Genres | `/genres/` |
| Compagnies | `/companies/` |
| Filtres (plateforme, genre…) | via `/games/?filter=...` |
| Tri | via `/games/?sort=...` |

---












