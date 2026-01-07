import os

from celery import Celery
from celery.schedules import crontab

# Configuration de l'environnement Django pour Celery
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("ludokan")

# Configuration Celery depuis les settings Django
app.config_from_object("django.conf:settings", namespace="CELERY")

# Découverte automatique des tâches dans toutes les apps
app.autodiscover_tasks()

# Configuration des tâches périodiques (optionnel)
app.conf.beat_schedule = {
    "expire-old-matchmaking-requests": {
        "task": "apps.matchmaking.tasks.expire_old_matchmaking_requests",
        "schedule": crontab(minute="*/15"),  # toutes les 15 minutes
    },
}

# Configuration des résultats (optionnel)
app.conf.result_backend = "redis://redis:6379/1"
app.conf.cache_backend = "redis://redis:6379/2"


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
