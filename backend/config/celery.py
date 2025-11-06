import os
from celery import Celery

# Configuration de l'environnement Django pour Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('ludokan')

# Configuration Celery depuis les settings Django
app.config_from_object('django.conf:settings', namespace='CELERY')

# Découverte automatique des tâches dans toutes les apps
app.autodiscover_tasks()

# Configuration des tâches périodiques (optionnel)
app.conf.beat_schedule = {
    # Exemple de tâche périodique
    # 'cleanup-sessions': {
    #     'task': 'apps.core.tasks.cleanup_sessions',
    #     'schedule': 3600.0,  # Toutes les heures
    # },
}

# Configuration des résultats (optionnel)
app.conf.result_backend = 'redis://redis:6379/1'
app.conf.cache_backend = 'redis://redis:6379/2'

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
