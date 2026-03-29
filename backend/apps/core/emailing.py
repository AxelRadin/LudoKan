from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .email_quota import can_send_email, increment_email_quota


class EmailQuotaExceeded(Exception):
    pass


def _is_allowed_recipient(to_list: list[str]) -> bool:
    if not settings.EMAIL_ALLOWLIST_ENABLED:
        return True
    allowed = set(settings.EMAIL_ALLOWLIST)
    return all(email in allowed for email in to_list)


def send_email_guarded(
    *,
    subject: str,
    to: list[str],
    text_body: str,
    html_body: str | None = None,
    from_email: str | None = None,
    attachments: list | None = None,
):
    recipient_count = len(to)

    if not _is_allowed_recipient(to):
        raise ValueError("Recipient not allowed in this environment")

    if not can_send_email(recipient_count=recipient_count):
        raise EmailQuotaExceeded("Email quota reached")

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=from_email or settings.DEFAULT_FROM_EMAIL,
        to=to,
    )

    if html_body:
        msg.attach_alternative(html_body, "text/html")

    for attachment in attachments or []:
        msg.attach(*attachment)

    sent = msg.send()

    if sent:
        increment_email_quota(recipient_count=recipient_count)

    return sent
