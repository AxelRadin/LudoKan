# Commandes de Gestion (Management Commands)

Le projet LudoKan inclut plusieurs commandes Django pour faciliter la gestion et la maintenance des données, notamment celles issues d'IGDB.

## Backfill des Médias IGDB (`backfill_game_media`)

Cette commande permet de récupérer et de synchroniser les médias (screenshots, vidéos) pour les jeux déjà présents dans la base de données locale qui possèdent un identifiant IGDB (`igdb_id`).

### Cas d'usage

Lorsqu'un jeu a été importé dans le passé (sans les médias) et que vous souhaitez maintenant télécharger ses images et vidéos associées depuis l'API IGDB pour les afficher. 
La commande utilise l'API IGDB par lot et garantit la non-duplication des médias si elle est relancée.

### Utilisation

```bash
docker compose exec web python manage.py backfill_game_media [options]
```

### Options disponibles

* `--limit <nombre>` : Limite le nombre de jeux à traiter en une seule exécution (utile pour tester ou pour ne pas surcharger l'API).
* `--dry-run` : Simule l'exécution. Interroge IGDB et affiche dans les logs ce qui serait récupéré, sans rien modifier dans la base de données locale.
* `--game-id <id>` : Cible explicitement un jeu précis via son ID interne (celui stocké dans la base locale).
* `--igdb-id <id>` : Cible explicitement un jeu précis via son ID externe provenant d'IGDB.

### Exemples de commandes

**1. Simuler la récupération pour les 10 jeux les plus populaires :**
```bash
docker compose exec web python manage.py backfill_game_media --limit 10 --dry-run
```

**2. Récupérer les médias pour un jeu particulier (par exemple, The Witcher 3 avec l'ID IGDB 1942) :**
```bash
docker compose exec web python manage.py backfill_game_media --igdb-id 1942
```

**3. Relancer la synchronisation sur toute la base (par lots de 50) :**
```bash
docker compose exec web python manage.py backfill_game_media
```

### Gestion des Erreurs

- La commande traite les jeux en lots (chunks) par mesure d'efficacité.
- Si un jeu génère une erreur (par exemple, problème d'intégrité ou souci temporaire IGDB), l'erreur est loggée et le traitement se poursuit sans s'interrompre.
- Les logs récapitulent le nombre de jeux traités, réussis et en erreur à la fin de l'exécution.
