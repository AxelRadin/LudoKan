"""
Commande pour exécuter les rapports planifiés échus (BACK-021F).
Utilisable sans Celery : à lancer par cron (ex. toutes les 15 min) pour l'automatisation.

Exemple cron (toutes les 15 min) :
  */15 * * * * cd /chemin/vers/projet/backend && python manage.py run_scheduled_reports
Avec Docker :
  */15 * * * * docker compose exec -T web python manage.py run_scheduled_reports
"""

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.core.models import ReportSchedule
from apps.core.report_schedule_service import run_schedule


class Command(BaseCommand):
    help = "Traite les ReportSchedule échus (enabled, next_run <= now ou null). Génère rapport, envoi email, logs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Affiche les schedules échus sans les exécuter.",
        )

    def handle(self, *args, **options):
        now = timezone.now()
        due = list(ReportSchedule.objects.filter(enabled=True).filter(Q(next_run__lte=now) | Q(next_run__isnull=True)).order_by("next_run"))

        if options["dry_run"]:
            self.stdout.write(f"Dry-run : {len(due)} schedule(s) échu(s).")
            for s in due:
                self.stdout.write(f"  - id={s.pk} type={s.report_type} frequency={s.frequency}")
            return

        if not due:
            self.stdout.write("Aucun schedule échu.")
            return

        results = []
        for schedule in due:
            try:
                out = run_schedule(schedule)
                results.append({"schedule_id": schedule.pk, "report_type": schedule.report_type, **out})
                status = "OK" if out.get("success") else "skipped/error"
                self.stdout.write(self.style.SUCCESS(f"  Schedule {schedule.pk} ({schedule.report_type}) : {status}"))
            except Exception as e:
                results.append(
                    {
                        "schedule_id": schedule.pk,
                        "report_type": schedule.report_type,
                        "success": False,
                        "error": str(e),
                    }
                )
                self.stdout.write(self.style.ERROR(f"  Schedule {schedule.pk} : {e!s}"))

        self.stdout.write(self.style.SUCCESS(f"Traîté(s) : {len(results)} schedule(s)."))
