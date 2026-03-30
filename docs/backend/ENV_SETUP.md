# 🔧 Guide de Configuration des Variables d'Environnement

## 📋 Vue d'ensemble

Ce guide vous explique comment configurer et utiliser les variables d'environnement pour votre projet LudoKan avec Docker et Celery.

## 🚀 Installation rapide

### Option 1 : Script automatique (recommandé)
```bash
# Depuis le dossier backend
python setup_env.py
ou 
python3 setup_env.py
```

### Option 2 : Création manuelle
```bash
# Copier le template
cp env_template.txt ../.env

# Éditer le fichier
nano ../.env
```

## 📁 Structure des fichiers

```
LudoKan/
├── .env                    # ← Fichier de configuration (à créer)
├── docker-compose.yml
├── backend/
│   ├── env_template.txt    # ← Template des variables
│   ├── setup_env.py        # ← Script de génération
│   └── config/
│       └── settings.py     # ← Configuration Django
```

## 🔑 Variables d'environnement

### Variables obligatoires
```bash
# Base de données
POSTGRES_DB=tesp_db
POSTGRES_USER=tesp_user
POSTGRES_PASSWORD=tesp_password

# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
```

### Variables optionnelles
```bash
# Email
DEFAULT_FROM_EMAIL=noreply@ludokan.com
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
# Préfixe sujets (Django ; espace final recommandé). Si ACCOUNT_* absent, allauth réutilise cette valeur par défaut.
EMAIL_SUBJECT_PREFIX="[LudoKan] "
# Préfixe explicite allauth (confirmation, etc.) — à différencier par environnement si besoin
ACCOUNT_EMAIL_SUBJECT_PREFIX="[LudoKan] "

# Redis & Celery
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=True
```

### IGDB / Twitch (proxy API jeux)

Pour que les endpoints **api/igdb/** (recherche, tendances, détails de jeux) fonctionnent, le backend doit pouvoir appeler l’API IGDB. Deux possibilités :

1. **OAuth Twitch (recommandé)**  
   Définir `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` (compte Twitch / développeur). Le backend récupère alors un token d’accès via `https://id.twitch.tv/oauth2/token` (grant client_credentials) et le met en cache jusqu’à expiration.

2. **Token manuel**  
   Si Twitch OAuth n’est pas configuré, définir `IGDB_ACCESS_TOKEN` et `IGDB_CLIENT_ID`. Le backend utilisera ce token sans appeler Twitch.

**Priorité :** si `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` sont tous deux définis, le backend utilise toujours l’Option 1 (Twitch OAuth) et n’utilise pas `IGDB_ACCESS_TOKEN`.

```bash
# Option 1 (recommandée, prioritaire) : Twitch OAuth
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Option 2 : uniquement si vous n'utilisez pas Option 1
# IGDB_CLIENT_ID=your_igdb_client_id
# IGDB_ACCESS_TOKEN=your_app_access_token   # pas le Client Secret !
```

**En cas d’erreur 401 (Authorization Failure) avec l’Option 1 :**

- Créez l’app dans le [Twitch Developer Console](https://dev.twitch.tv/console/apps) et assurez-vous que le **Client type** est **Confidential** (pour avoir un Client Secret).
- Utilisez bien le **Client ID** et le **Client Secret** de cette app. Ne mettez **jamais** le Client Secret dans `Authorization` / `IGDB_ACCESS_TOKEN` : le token est obtenu automatiquement via Twitch OAuth.
- Dans le `.env`, évitez les espaces ou guillemets inutiles : `TWITCH_CLIENT_ID=abc123` (sans espaces autour du `=`, pas de guillemets sauf si la valeur contient des espaces).
- Vous pouvez tester l’auth dans [Postman](https://www.postman.com/) : `POST https://id.twitch.tv/oauth2/token` avec `client_id`, `client_secret`, `grant_type=client_credentials`, puis `POST https://api.igdb.com/v4/games` avec les headers `Client-ID` et `Authorization: Bearer <access_token>`.

## 🛠️ Configuration dans Django

### 1. Installation des dépendances
```bash
pip install python-decouple
```

### 2. Utilisation dans settings.py
```python
from decouple import config

# Variables avec valeurs par défaut
SECRET_KEY = config('SECRET_KEY', default='fallback-key')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')

# Base de données
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB', default='tesp_db'),
        'USER': config('POSTGRES_USER', default='tesp_user'),
        'PASSWORD': config('POSTGRES_PASSWORD', default='tesp_password'),
        'HOST': config('DB_HOST', default='db'),
        'PORT': config('DB_PORT', default='5432'),
    }
}
```

## 🐳 Configuration Docker

### 1. docker-compose.yml
```yaml
services:
  web:
    env_file:
      - .env  # ← Charge le fichier .env
    environment:
      - DEBUG=${DEBUG}
      - SECRET_KEY=${SECRET_KEY}
```

### 2. Dockerfile
```dockerfile
# Pas de modification nécessaire
# Les variables sont injectées par docker-compose
```

## 🧪 Test de la configuration

### 1. Vérifier les variables
```bash
# Vérifier que le fichier .env est chargé
docker compose exec web python -c "from django.conf import settings; print(settings.SECRET_KEY[:10])"

# Tester la connexion à la base de données
docker compose exec web python manage.py check --database default

# Tester Celery
docker compose exec web python test_celery.py
```

### 2. Commandes utiles
```bash
# Voir toutes les variables d'environnement
docker compose exec web env | grep -E "(POSTGRES|SECRET|DEBUG)"

# Redémarrer avec les nouvelles variables
docker compose down && docker compose up -d

# Vérifier les logs
docker compose logs web
```

## 🔒 Sécurité

### Variables sensibles
- `SECRET_KEY` : Clé secrète Django (générée automatiquement)
- `POSTGRES_PASSWORD` : Mot de passe de la base de données
- `EMAIL_HOST_PASSWORD` : Mot de passe email (production)

### Bonnes pratiques
1. **Ne jamais commiter le fichier .env**
2. **Utiliser des mots de passe forts en production**
3. **Régénérer les clés secrètes régulièrement**
4. **Utiliser des services de gestion de secrets en production**

## 🚀 Déploiement

### Développement
```bash
# Utiliser le fichier .env local
docker compose up -d
```

### Production
```bash
# Utiliser des variables d'environnement système
export SECRET_KEY="your-production-secret"
export DEBUG=False
export POSTGRES_PASSWORD="strong-password"

docker compose up -d
```

## 🐛 Dépannage

### Problème : Variables non chargées
```bash
# Vérifier que le fichier .env existe
ls -la .env

# Vérifier le contenu
cat .env | head -5

# Redémarrer Docker
docker compose down && docker compose up -d
```

### Problème : Erreur de connexion DB
```bash
# Vérifier les variables de base de données
docker compose exec web python -c "from django.conf import settings; print(settings.DATABASES)"

# Vérifier la connexion
docker compose exec web python manage.py dbshell
```

### Problème : Celery ne fonctionne pas
```bash
# Vérifier Redis
docker compose exec redis redis-cli ping

# Vérifier les variables Celery
docker compose exec web python -c "from django.conf import settings; print(settings.CELERY_BROKER_URL)"
```

## 📚 Ressources

- [Documentation python-decouple](https://github.com/henriquebastos/python-decouple)
- [Django Settings](https://docs.djangoproject.com/en/4.2/topics/settings/)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Celery Configuration](https://docs.celeryproject.org/en/stable/userguide/configuration.html)
