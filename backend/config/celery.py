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


@app.on_after_configure.connect
def _register_celery_failure_logging(sender, **kwargs):
    """Enregistre les échecs de tâches Celery dans system_logs"""
    from celery.signals import task_failure

    def _on_task_failure(sender_task, task_id, exception, args, kwargs, traceback, einfo, **kw):
        try:
            from apps.core.logging_utils import log_system_event

            log_system_event(
                event_type="celery_task_failure",
                description=str(exception)[:500],
                metadata={
                    "task_id": task_id,
                    "task_name": getattr(sender_task, "name", str(sender_task)),
                    "exception_type": type(exception).__name__,
                },
            )
        except Exception:
            pass

    task_failure.connect(_on_task_failure, weak=False)


# Configuration des tâches périodiques (optionnel)
app.conf.beat_schedule = {
    "expire-old-matchmaking-requests": {
        "task": "apps.matchmaking.tasks.expire_old_matchmaking_requests",
        "schedule": crontab(minute="*/15"),  # toutes les 15 minutes
    },
    "process-due-report-schedules": {
        "task": "apps.core.tasks.process_due_report_schedules",
        "schedule": crontab(minute="*/15"),  # toutes les 15 min (BACK-021F)
    },
    "process-party-deadlines": {
        "task": "apps.parties.tasks.process_party_deadlines",
        "schedule": crontab(minute="*"),  # chaque minute (MVP parties)
    },
}

# Configuration des résultats (optionnel)
app.conf.result_backend = "redis://redis:6379/1"
app.conf.cache_backend = "redis://redis:6379/2"


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
