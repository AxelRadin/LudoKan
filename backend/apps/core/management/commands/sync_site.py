from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Synchronise django.contrib.sites avec les variables d'environnement"

    def handle(self, *args, **options):
        site_id = getattr(settings, "SITE_ID", 1)
        domain = getattr(settings, "SITE_DOMAIN", "").strip()
        name = getattr(settings, "SITE_NAME", "").strip()

        if not domain:
            self.stdout.write(self.style.WARNING("SITE_DOMAIN vide, aucune mise à jour effectuée."))
            return

        if not name:
            name = domain

        Site.objects.update_or_create(
            id=site_id,
            defaults={
                "domain": domain,
                "name": name,
            },
        )

        self.stdout.write(self.style.SUCCESS(f"Site #{site_id} synchronisé: domain={domain}, name={name}"))
