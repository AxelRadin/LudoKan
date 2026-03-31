from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .email_quota import can_send_email, increment_email_quota
from .logging_utils import log_email_event


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
    mail_type: str = "generic",
):
    recipient_count = len(to)
    recipients = list(to)

    if not _is_allowed_recipient(to):
        err = ValueError("Recipient not allowed in this environment")
        log_email_event(
            "email_send_failed",
            mail_type=mail_type,
            recipients=recipients,
            description="Destinataire hors allowlist",
            exception=err,
        )
        raise err

    if not can_send_email(recipient_count=recipient_count):
        log_email_event(
            "email_quota_blocked",
            mail_type=mail_type,
            recipients=recipients,
            description="Quota e-mail journalier ou mensuel atteint",
        )
        raise EmailQuotaExceeded("Email quota reached")

    log_email_event(
        "email_send_requested",
        mail_type=mail_type,
        recipients=recipients,
        description=f"Envoi demandé : {subject[:120]}",
    )

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

    try:
        sent = msg.send()
    except Exception as exc:
        log_email_event(
            "email_send_failed",
            mail_type=mail_type,
            recipients=recipients,
            description="Échec à l’envoi (exception SMTP / backend)",
            exception=exc,
        )
        raise

    if not sent:
        log_email_event(
            "email_send_failed",
            mail_type=mail_type,
            recipients=recipients,
            description="Échec à l’envoi (aucun message accepté par le backend)",
            extra_metadata={"reason": "send_returned_zero"},
        )
    else:
        increment_email_quota(recipient_count=recipient_count)
        log_email_event(
            "email_send_succeeded",
            mail_type=mail_type,
            recipients=recipients,
            description=f"Envoi réussi : {subject[:120]}",
        )

    return sent
