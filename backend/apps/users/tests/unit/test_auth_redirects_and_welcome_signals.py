"""
Couverture des redirections email / reset (views) et des signaux de bienvenue (signals).
"""

from unittest.mock import MagicMock, patch

import pytest
from allauth.account.models import EmailAddress
from allauth.account.signals import email_confirmed, user_signed_up
from django.test import override_settings

from apps.users.models import CustomUser


@pytest.mark.django_db
class TestAuthEmailRedirects:
    """password_reset_confirm_redirect et email_confirm_redirect."""

    @override_settings(FRONTEND_BASE_URL="http://localhost:5173")
    def test_password_reset_confirm_redirect(self, client):
        response = client.get(
            "/api/auth/password/reset/confirm/dWlkLTEyMw/set-reset-token/",
            follow=False,
        )
        assert response.status_code == 302
        assert response["Location"] == "http://localhost:5173/reset-password/dWlkLTEyMw/set-reset-token"

    @override_settings(FRONTEND_BASE_URL="https://app.example.com/")
    def test_password_reset_confirm_redirect_strips_frontend_trailing_slash(self, client):
        response = client.get(
            "/api/auth/password/reset/confirm/uidb64abc/tokenxyz/",
            follow=False,
        )
        assert response.status_code == 302
        assert response["Location"] == "https://app.example.com/reset-password/uidb64abc/tokenxyz"

    @override_settings(FRONTEND_BASE_URL="http://localhost:5173")
    def test_email_confirm_redirect(self, client):
        response = client.get(
            "/api/auth/registration/account-confirm-email/confirm-key-1a2b/",
            follow=False,
        )
        assert response.status_code == 302
        assert response["Location"] == "http://localhost:5173/verify-email/confirm-key-1a2b"

    @override_settings(FRONTEND_BASE_URL="https://frontend.test/")
    def test_email_confirm_redirect_strips_frontend_trailing_slash(self, client):
        response = client.get(
            "/api/auth/registration/account-confirm-email/k/",
            follow=False,
        )
        assert response.status_code == 302
        assert response["Location"] == "https://frontend.test/verify-email/k"


@pytest.mark.django_db
class TestWelcomeEmailSignals:
    """send_welcome_email_on_confirmation et send_welcome_email_on_social_signup."""

    def test_send_welcome_email_on_confirmation(self):
        user = CustomUser.objects.create_user(
            email="confirmed@example.com",
            pseudo="confirmed",
            password="Secret123!",
        )
        email_address = EmailAddress.objects.create(
            user=user,
            email=user.email,
            primary=True,
            verified=True,
        )
        request = MagicMock()

        with patch("apps.users.signals.get_adapter") as get_adapter:
            adapter = MagicMock()
            get_adapter.return_value = adapter
            email_confirmed.send(
                sender=EmailAddress,
                request=request,
                email_address=email_address,
            )

        get_adapter.assert_called_once_with(request)
        adapter.send_mail.assert_called_once_with(
            "account/email/welcome",
            email_address.email,
            {"user": user},
        )

    def test_send_welcome_email_on_social_signup_when_verified(self):
        user = CustomUser.objects.create_user(
            email="socialwelcome@example.com",
            pseudo="socialwelcome",
            password="Secret123!",
        )
        EmailAddress.objects.create(
            user=user,
            email=user.email,
            primary=True,
            verified=True,
        )
        request = MagicMock()

        with patch("apps.users.signals.get_adapter") as get_adapter:
            adapter = MagicMock()
            get_adapter.return_value = adapter
            user_signed_up.send(sender=CustomUser, request=request, user=user)

        get_adapter.assert_called_once_with(request)
        adapter.send_mail.assert_called_once_with(
            "account/email/welcome",
            user.email,
            {"user": user},
        )

    def test_send_welcome_email_on_social_signup_skips_without_verified_address(self):
        user = CustomUser.objects.create_user(
            email="noverify@example.com",
            pseudo="noverify",
            password="Secret123!",
        )
        request = MagicMock()

        with patch("apps.users.signals.get_adapter") as get_adapter:
            user_signed_up.send(sender=CustomUser, request=request, user=user)

        get_adapter.assert_not_called()
