from django.conf import settings
from django.core.cache import cache
from django.utils import timezone


def _day_key() -> str:
    return f"email_quota:day:{settings.ENVIRONMENT}:{timezone.localdate().isoformat()}"


def _month_key() -> str:
    return f"email_quota:month:{settings.ENVIRONMENT}:{timezone.localdate().strftime('%Y-%m')}"


def can_send_email(recipient_count: int = 1) -> bool:
    if not settings.EMAIL_QUOTA_ENABLED:
        return True

    day_count = cache.get(_day_key(), 0)
    month_count = cache.get(_month_key(), 0)

    if day_count + recipient_count > settings.EMAIL_DAILY_LIMIT:
        return False

    if month_count + recipient_count > settings.EMAIL_MONTHLY_LIMIT:
        return False

    return True


def increment_email_quota(recipient_count: int = 1) -> None:
    day_key = _day_key()
    month_key = _month_key()

    try:
        cache.incr(day_key, recipient_count)
    except ValueError:
        cache.set(day_key, recipient_count, timeout=60 * 60 * 48)

    try:
        cache.incr(month_key, recipient_count)
    except ValueError:
        cache.set(month_key, recipient_count, timeout=60 * 60 * 24 * 40)
