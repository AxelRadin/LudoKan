import time

from celery import shared_task
from django.utils import timezone

from .emailing import EmailQuotaExceeded, send_email_guarded


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def process_due_report_schedules(self):
    """
    Tâche périodique (Celery Beat) pour les rapports planifiés (BACK-021F).
    Récupère les schedules actifs dont next_run <= now (ou next_run null),
    génère le rapport, export CSV, envoi email, log system_logs, met à jour last_run/next_run.
    """
    from django.db.models import Q

    from .models import ReportSchedule
    from .report_schedule_service import run_schedule

    now = timezone.now()
    due = list(ReportSchedule.objects.filter(enabled=True).filter(Q(next_run__lte=now) | Q(next_run__isnull=True)).order_by("next_run"))
    results = []
    for schedule in due:
        out = run_schedule(schedule)
        results.append({"schedule_id": schedule.pk, "report_type": schedule.report_type, **out})
    return {"processed": len(results), "results": results}


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    dont_autoretry_for=(EmailQuotaExceeded, ValueError),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def send_welcome_email(self, user_email, username):
    """Envoie l’email de bienvenue via le service centralisé (hors thread HTTP)."""
    send_email_guarded(
        subject="Bienvenue sur LudoKan!",
        text_body=f"Bonjour {username}, bienvenue sur notre plateforme!",
        to=[user_email],
        mail_type="welcome",
    )
    return f"Email envoyé à {user_email}"


@shared_task
def process_game_data(game_id):
    """
    Tâche pour traiter des données de jeu (exemple)
    """
    # Simulation d'un traitement long
    time.sleep(5)

    return f"Données du jeu {game_id} traitées avec succès"


@shared_task
def cleanup_old_sessions():
    """
    Tâche de nettoyage des sessions expirées
    """
    from django.contrib.sessions.models import Session
    from django.utils import timezone

    # Supprimer les sessions expirées
    expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
    count = expired_sessions.count()
    expired_sessions.delete()

    return f"{count} sessions expirées supprimées"


@shared_task
def generate_user_statistics(user_id):
    """
    Tâche pour générer des statistiques utilisateur
    """
    # Simulation d'un calcul complexe
    time.sleep(3)

    # Ici vous pourriez calculer:
    # - Nombre de jeux joués
    # - Temps de jeu total
    # - Préférences de genre
    # - etc.

    return f"Statistiques générées pour l'utilisateur {user_id}"
