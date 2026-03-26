# Configuration Celery pour LudoKan

## 🚀 Démarrage rapide

### 1. Démarrer tous les services
```bash
docker compose up -d
```

### 2. Vérifier que Celery fonctionne
```bash
# Voir les logs du worker
docker compose logs celery

# Voir les logs du scheduler
docker compose logs celery-beat

# Tester les tâches
docker compose exec web python test_celery.py
```

## 📋 Services disponibles

- **web**: Application Django (port 8000)
- **db**: PostgreSQL (port 5432)
- **redis**: Redis (port 6379)
- **celery**: Worker Celery pour les tâches asynchrones
- **celery-beat**: Scheduler pour les tâches périodiques

## 🔧 Commandes utiles

### Gestion des services
```bash
# Démarrer seulement Celery
docker compose up celery celery-beat

# Redémarrer Celery
docker compose restart celery celery-beat

# Voir les logs en temps réel
docker compose logs -f celery
```

### Monitoring Celery
```bash
# Accéder au shell Django
docker compose exec web python manage.py shell

# Dans le shell Python:
from apps.core.tasks import send_welcome_email
result = send_welcome_email.delay("test@example.com", "TestUser")
print(result.get())
```

### Commandes Celery directes
```bash
# Worker avec plus de verbosité
docker compose exec web celery -A config worker -l debug

# Beat scheduler
docker compose exec web celery -A config beat -l info

# Voir les tâches en attente
docker compose exec web celery -A config inspect active

# Purger toutes les tâches
docker compose exec web celery -A config purge
```

## 📝 Exemples de tâches

### Tâche simple
```python
from celery import shared_task

@shared_task
def ma_tache(param1, param2):
    # Votre logique ici
    return f"Traitement terminé: {param1} + {param2}"
```

### Tâche avec retry
```python
from celery import shared_task
from celery.exceptions import Retry

@shared_task(bind=True, max_retries=3)
def tache_avec_retry(self, data):
    try:
        # Votre logique ici
        return "Succès"
    except Exception as exc:
        # Retry après 60 secondes
        raise self.retry(exc=exc, countdown=60)
```

### Tâche périodique
Dans `config/celery.py`, ajoutez à `beat_schedule`:
```python
app.conf.beat_schedule = {
    'nettoyage-quotidien': {
        'task': 'apps.core.tasks.cleanup_old_sessions',
        'schedule': crontab(hour=2, minute=0),  # Tous les jours à 2h
    },
}
```

## 🐛 Dépannage

### Problème: Worker ne démarre pas
```bash
# Vérifier les logs
docker compose logs celery

# Vérifier la configuration
docker compose exec web python -c "from config.celery import app; print(app.conf.broker_url)"
```

### Problème: Tâches ne s'exécutent pas
```bash
# Vérifier la connexion Redis
docker compose exec redis redis-cli ping

# Vérifier les tâches en attente
docker compose exec web celery -A config inspect active
```

### Problème: Beat ne fonctionne pas
```bash
# Vérifier les logs
docker compose logs celery-beat

# Redémarrer beat
docker compose restart celery-beat
```

## 📊 Monitoring avancé

### Flower (interface web pour Celery)
Ajoutez à `requirements.txt`:
```
flower==2.0.1
```

Ajoutez au `docker-compose.yml`:
```yaml
flower:
  build: 
    context: backend
    dockerfile: Dockerfile
  command: celery -A config flower
  ports:
    - "5555:5555"
  env_file:
    - .env
  depends_on:
    - redis
```

Accédez à http://localhost:5555 pour le monitoring.
