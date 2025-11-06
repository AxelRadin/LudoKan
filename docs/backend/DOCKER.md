# 🐳 Guide Docker pour LudoKan

## 📋 Vue d'ensemble

Ce guide explique comment utiliser Docker avec le projet LudoKan, incluant la configuration des services, le développement, et le déploiement.

## 🏗️ Architecture Docker

### Services disponibles

| Service | Port | Description |
|---------|------|-------------|
| `web` | 8000 | Application Django |
| `db` | 5432 | Base de données PostgreSQL |
| `redis` | 6379 | Cache et broker Celery |
| `celery` | - | Worker Celery |
| `celery-beat` | - | Scheduler Celery |

### Structure des fichiers

```
LudoKan/
├── docker-compose.yml          # Configuration des services
├── backend/
│   ├── Dockerfile              # Image de l'application
│   ├── docker/
│   │   └── entrypoint.sh       # Script d'initialisation
│   └── requirements.txt        # Dépendances Python
└── .env                        # Variables d'environnement
```

## 🚀 Démarrage rapide

### 1. Prérequis
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 2. Installation
```bash
# Cloner le projet
git clone <repository-url>
cd LudoKan

# Configurer l'environnement
cp backend/env_template.txt .env
# Éditer .env selon vos besoins

# Démarrer tous les services
docker compose up -d

# Vérifier le statut
docker compose ps
```

### 3. Vérification
```bash
# Vérifier que l'API fonctionne
curl http://localhost:8000/health/

# Vérifier les logs
docker compose logs web
```

## 🔧 Configuration

### Variables d'environnement

Le fichier `.env` contient toutes les variables nécessaires :

```bash
# Base de données
POSTGRES_DB=tesp_db
POSTGRES_USER=tesp_user
POSTGRES_PASSWORD=tesp_password

# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# Redis & Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
```

### Personnalisation

#### Modifier les ports
```yaml
# docker-compose.yml
services:
  web:
    ports:
      - "3000:8000"  # Changer le port externe
```

#### Ajouter des volumes
```yaml
services:
  web:
    volumes:
      - ./custom-config:/app/config
```

## 🛠️ Développement

### Commandes utiles

#### Gestion des services
```bash
# Démarrer un service spécifique
docker compose up web

# Redémarrer un service
docker compose restart web

# Arrêter tous les services
docker compose down

# Voir les logs en temps réel
docker compose logs -f web
```

#### Accès aux conteneurs
```bash
# Shell dans le conteneur web
docker compose exec web bash

# Shell Django
docker compose exec web python manage.py shell

# Exécuter des commandes
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic
```

#### Base de données
```bash
# Accès à PostgreSQL
docker compose exec db psql -U tesp_user -d tesp_db

# Sauvegarder la base
docker compose exec db pg_dump -U tesp_user tesp_db > backup.sql

# Restaurer la base
docker compose exec -T db psql -U tesp_user tesp_db < backup.sql
```

#### Redis
```bash
# Accès à Redis
docker compose exec redis redis-cli

# Vider le cache
docker compose exec redis redis-cli FLUSHALL
```

### Développement avec hot-reload

Pour le développement avec rechargement automatique :

```bash
# Démarrer en mode développement
docker compose up web

# Les modifications de code sont automatiquement rechargées
```

## 🧪 Tests

### Exécuter les tests
```bash
# Tous les tests
docker compose exec web python run_tests.py

# Tests avec couverture
docker compose exec web python run_tests.py --coverage

# Tests d'une app spécifique
docker compose exec web python run_tests.py --app users
```

### Tests d'intégration
```bash
# Tests avec tous les services
docker compose up -d
docker compose exec web python run_tests.py --integration
```

## 📊 Monitoring

### Logs
```bash
# Logs de tous les services
docker compose logs

# Logs d'un service spécifique
docker compose logs web
docker compose logs celery

# Logs en temps réel
docker compose logs -f
```

### Métriques
```bash
# Utilisation des ressources
docker stats

# Informations sur les conteneurs
docker compose ps
```

## 🔧 Dépannage

### Problèmes courants

#### Service ne démarre pas
```bash
# Vérifier les logs
docker compose logs web

# Vérifier la configuration
docker compose config

# Redémarrer
docker compose down && docker compose up -d
```

#### Problème de base de données
```bash
# Vérifier la connexion
docker compose exec web python manage.py dbshell

# Recréer la base
docker compose down -v
docker compose up -d
```

#### Problème de cache Redis
```bash
# Vérifier Redis
docker compose exec redis redis-cli ping

# Vider le cache
docker compose exec redis redis-cli FLUSHALL
```

#### Problème de Celery
```bash
# Vérifier les workers
docker compose logs celery

# Redémarrer Celery
docker compose restart celery celery-beat
```

### Nettoyage

```bash
# Supprimer les conteneurs et volumes
docker compose down -v

# Supprimer les images
docker compose down --rmi all

# Nettoyer complètement
docker system prune -a
```

## 📚 Ressources
- [Documentation Docker](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Django avec Docker](https://docs.djangoproject.com/en/stable/howto/deployment/docker/)
- [Celery avec Docker](https://docs.celeryproject.org/en/stable/userguide/deployment/docker.html)

