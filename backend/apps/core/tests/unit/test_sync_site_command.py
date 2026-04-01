"""
Tests pour la commande sync_site (alignement django.contrib.sites avec les settings).
"""

from io import StringIO

import pytest
from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management import call_command
from django.test import override_settings


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(SITE_DOMAIN="", SITE_NAME="Mon site")
def test_sync_site_warns_when_domain_empty():
    """SITE_DOMAIN vide : message d'avertissement, aucune mise à jour."""
    out = StringIO()
    call_command("sync_site", stdout=out)
    assert "SITE_DOMAIN vide" in out.getvalue()
    assert "aucune mise à jour" in out.getvalue().lower()


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(SITE_DOMAIN="app.example.test", SITE_NAME="")
def test_sync_site_defaults_name_to_domain_when_name_empty():
    """SITE_NAME vide : le nom du Site reprend le domaine."""
    out = StringIO()
    call_command("sync_site", stdout=out)
    site_id = getattr(settings, "SITE_ID", 1)
    site = Site.objects.get(pk=site_id)
    assert site.domain == "app.example.test"
    assert site.name == "app.example.test"
    assert "synchronisé" in out.getvalue().lower()


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(SITE_DOMAIN="api.ludokan.test", SITE_NAME="LudoKan Staging")
def test_sync_site_updates_domain_and_name():
    """SITE_DOMAIN et SITE_NAME renseignés : update_or_create et message succès."""
    out = StringIO()
    call_command("sync_site", stdout=out)
    site_id = getattr(settings, "SITE_ID", 1)
    site = Site.objects.get(pk=site_id)
    assert site.domain == "api.ludokan.test"
    assert site.name == "LudoKan Staging"
    assert "synchronisé" in out.getvalue().lower()
    assert "api.ludokan.test" in out.getvalue()
