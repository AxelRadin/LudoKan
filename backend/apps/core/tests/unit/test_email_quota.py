"""Tests unitaires pour email_quota (quotas journalier / mensuel, cache)."""

import pytest
from django.core.cache import cache
from django.test.utils import override_settings

from apps.core import email_quota
from apps.core.email_quota import can_send_email, increment_email_quota


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=False)
def test_can_send_email_disabled_always_true():
    """Si EMAIL_QUOTA_ENABLED est False, can_send_email retourne True sans lire le cache."""
    cache.set(email_quota._day_key(), 999999)
    assert can_send_email(recipient_count=50) is True


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=True, EMAIL_DAILY_LIMIT=100, EMAIL_MONTHLY_LIMIT=1000)
def test_can_send_email_under_limits():
    """Sans compteurs en cache, l’envoi est autorisé sous les plafonds."""
    assert can_send_email(recipient_count=1) is True
    assert can_send_email(recipient_count=10) is True


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=True, EMAIL_DAILY_LIMIT=10, EMAIL_MONTHLY_LIMIT=1000)
def test_can_send_email_daily_limit_exceeded():
    cache.set(email_quota._day_key(), 10)
    assert can_send_email(recipient_count=1) is False


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=True, EMAIL_DAILY_LIMIT=100, EMAIL_MONTHLY_LIMIT=50)
def test_can_send_email_monthly_limit_exceeded():
    cache.set(email_quota._day_key(), 0)
    cache.set(email_quota._month_key(), 50)
    assert can_send_email(recipient_count=1) is False


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=True, EMAIL_DAILY_LIMIT=100, EMAIL_MONTHLY_LIMIT=1000)
def test_increment_email_quota_creates_keys_when_missing():
    """Premier appel : incr lève ValueError, branche cache.set pour jour et mois."""
    increment_email_quota(recipient_count=2)
    assert cache.get(email_quota._day_key()) == 2
    assert cache.get(email_quota._month_key()) == 2


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=True, EMAIL_DAILY_LIMIT=100, EMAIL_MONTHLY_LIMIT=1000)
def test_increment_email_quota_uses_incr_when_key_exists():
    cache.set(email_quota._day_key(), 5)
    cache.set(email_quota._month_key(), 5)
    increment_email_quota(recipient_count=3)
    assert cache.get(email_quota._day_key()) == 8
    assert cache.get(email_quota._month_key()) == 8
