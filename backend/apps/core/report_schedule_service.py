"""
Service pour l'exécution des rapports planifiés (BACK-021F).
Récupère les schedules actifs, génère le rapport, exporte (format par défaut CSV),
envoie par email et écrit dans system_logs (durée, taille fichier).
"""

import calendar
import time
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone

from .logging_utils import log_system_event
from .models import ReportSchedule
from .reports_export import build_activity_csv, build_games_csv, build_users_csv
from .views import build_activity_report_payload


# Import des builders depuis les apps (évite duplication, appelés au runtime)
def _get_users_payload():
    from apps.users.views import _build_users_report_payload

    return _build_users_report_payload()


def _get_games_payload():
    from apps.games.views import _build_games_report_payload

    return _build_games_report_payload()


DEFAULT_EXPORT_FORMAT = "csv"
REPORT_TYPE_TO_BUILDER = {
    ReportSchedule.ReportType.USERS: (_get_users_payload, build_users_csv, "report_users.csv"),
    ReportSchedule.ReportType.GAMES: (_get_games_payload, build_games_csv, "report_games.csv"),
    ReportSchedule.ReportType.ACTIVITY: (
        lambda: build_activity_report_payload("30d"),
        lambda p: build_activity_csv(p),
        "report_activity.csv",
    ),
}


def get_next_run(frequency: str, from_time=None):
    """
    Calcule la prochaine date d'exécution à partir de from_time.
    daily -> +1 jour, weekly -> +7 jours, monthly -> +1 mois.
    """
    from_time = from_time or timezone.now()
    if frequency == ReportSchedule.Frequency.DAILY:
        return from_time + timedelta(days=1)
    if frequency == ReportSchedule.Frequency.WEEKLY:
        return from_time + timedelta(days=7)
    if frequency == ReportSchedule.Frequency.MONTHLY:
        # +1 mois en gérant les fins de mois
        month = from_time.month - 1 + 1
        year = from_time.year + month // 12
        month = month % 12 + 1
        day = min(from_time.day, calendar.monthrange(year, month)[1])
        return from_time.replace(year=year, month=month, day=day, hour=from_time.hour, minute=from_time.minute, second=0, microsecond=0)
    return from_time + timedelta(days=1)


def run_schedule(schedule: ReportSchedule) -> dict:
    """
    Exécute un schedule : génère le rapport, export CSV, envoi email, log system_logs, met à jour last_run/next_run.
    Retourne un dict avec success, duration_seconds, file_size_bytes, error (si échec).
    """
    report_type = schedule.report_type
    if report_type not in REPORT_TYPE_TO_BUILDER:
        log_system_event(
            "report_schedule_error",
            f"Type de rapport inconnu: {report_type}",
            metadata={"schedule_id": schedule.pk},
        )
        return {"success": False, "error": f"Unknown report_type: {report_type}"}

    get_payload, build_export, filename = REPORT_TYPE_TO_BUILDER[report_type]
    recipients = [e for e in (schedule.recipients or []) if e]
    if not recipients:
        log_system_event(
            "report_schedule_skipped",
            "Aucun destinataire pour le schedule",
            metadata={"schedule_id": schedule.pk, "report_type": report_type},
        )
        schedule.last_run = timezone.now()
        schedule.next_run = get_next_run(schedule.frequency, schedule.last_run)
        schedule.save(update_fields=["last_run", "next_run", "updated_at"])
        return {"success": True, "skipped": True, "reason": "no_recipients"}

    started = time.monotonic()
    try:
        payload = get_payload()
        content = build_export(payload)
        if isinstance(content, str):
            content = content.encode("utf-8")
        file_size = len(content)

        email = EmailMessage(
            subject=f"LudoKan – Rapport {report_type} ({schedule.get_frequency_display()})",
            body=f"Rapport {report_type} généré automatiquement. Pièce jointe: {filename}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipients,
        )
        email.attach(filename, content, "text/csv; charset=utf-8")
        email.send(fail_silently=False)

        duration_seconds = time.monotonic() - started
        schedule.last_run = timezone.now()
        schedule.next_run = get_next_run(schedule.frequency, schedule.last_run)
        schedule.save(update_fields=["last_run", "next_run", "updated_at"])

        log_system_event(
            "report_generated",
            f"Rapport {report_type} envoyé à {len(recipients)} destinataire(s)",
            metadata={
                "schedule_id": schedule.pk,
                "report_type": report_type,
                "frequency": schedule.frequency,
                "duration_seconds": round(duration_seconds, 2),
                "file_size_bytes": file_size,
                "recipients_count": len(recipients),
            },
        )
        return {
            "success": True,
            "duration_seconds": duration_seconds,
            "file_size_bytes": file_size,
            "recipients_count": len(recipients),
        }
    except Exception as e:
        duration_seconds = time.monotonic() - started
        log_system_event(
            "report_schedule_error",
            f"Échec génération/envoi rapport {report_type}: {e!s}",
            metadata={
                "schedule_id": schedule.pk,
                "report_type": report_type,
                "duration_seconds": round(duration_seconds, 2),
                "error": str(e),
            },
        )
        return {"success": False, "error": str(e), "duration_seconds": duration_seconds}
