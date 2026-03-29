"""Tests pour send_email_guarded et les logs system_logs d’envoi d’e-mail."""

from unittest.mock import MagicMock, patch

import pytest
from django.test.utils import override_settings

from apps.core.emailing import EmailQuotaExceeded, send_email_guarded
from apps.core.models import SystemLog


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_ALLOWLIST_ENABLED=True, EMAIL_ALLOWLIST=["ok@example.com"])
def test_send_email_guarded_allowlist_blocked_logs_failed():
    with pytest.raises(ValueError, match="allow"):
        send_email_guarded(
            subject="S",
            to=["other@example.com"],
            text_body="x",
            mail_type="test_allowlist",
        )
    log = SystemLog.objects.get(event_type="email_send_failed")
    assert log.metadata["mail_type"] == "test_allowlist"
    assert log.metadata["recipients"] == ["other@example.com"]
    assert log.metadata["recipient_count"] == 1
    assert "exception" in log.metadata
    assert "ValueError" in log.metadata["exception"]


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=True)
def test_send_email_guarded_quota_blocked_logs():
    with patch("apps.core.emailing.can_send_email", return_value=False):
        with pytest.raises(EmailQuotaExceeded):
            send_email_guarded(
                subject="S",
                to=["a@b.com"],
                text_body="x",
                mail_type="test_quota",
            )
    log = SystemLog.objects.get(event_type="email_quota_blocked")
    assert log.metadata["mail_type"] == "test_quota"
    assert log.metadata["environment"] is not None
    assert log.metadata["recipient_count"] == 1


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=False)
def test_send_email_guarded_success_logs_requested_and_succeeded():
    with patch("apps.core.emailing.EmailMultiAlternatives") as mock_cls:
        mock_msg = MagicMock()
        mock_msg.send.return_value = 1
        mock_cls.return_value = mock_msg
        with patch("apps.core.emailing.increment_email_quota"):
            send_email_guarded(
                subject="Hello",
                to=["u@example.com"],
                text_body="body",
                mail_type="unit_success",
            )
    types = list(SystemLog.objects.order_by("id").values_list("event_type", flat=True))
    assert "email_send_requested" in types
    assert "email_send_succeeded" in types
    req = SystemLog.objects.get(event_type="email_send_requested")
    assert req.metadata["mail_type"] == "unit_success"
    assert req.metadata["recipients"] == ["u@example.com"]
    ok = SystemLog.objects.get(event_type="email_send_succeeded")
    assert ok.metadata["recipient_count"] == 1


@pytest.mark.django_db
@pytest.mark.unit
@override_settings(EMAIL_QUOTA_ENABLED=False)
def test_send_email_guarded_send_raises_logs_failed():
    with patch("apps.core.emailing.EmailMultiAlternatives") as mock_cls:
        mock_msg = MagicMock()
        mock_msg.send.side_effect = OSError("SMTP down")
        mock_cls.return_value = mock_msg
        with pytest.raises(OSError, match="SMTP"):
            send_email_guarded(
                subject="S",
                to=["u@example.com"],
                text_body="x",
                mail_type="unit_fail",
            )
    log = SystemLog.objects.get(event_type="email_send_failed")
    assert log.metadata["mail_type"] == "unit_fail"
    assert "OSError" in log.metadata["exception"]
