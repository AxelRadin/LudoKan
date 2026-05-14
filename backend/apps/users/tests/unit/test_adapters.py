from unittest.mock import MagicMock, patch

import pytest
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialAccount, SocialLogin
from allauth.socialaccount.signals import social_account_added

from apps.users.adapters import LudokanAccountAdapter, SocialAccountAdapter
from apps.users.models import CustomUser, XboxProfile


@pytest.mark.django_db
class TestSocialAccountSignals:
    def test_create_xbox_profile_on_signal(self):
        """
        Verify that XboxProfile is created when social_account_added signal is sent.
        """
        user = CustomUser.objects.create_user(email="signal_user@example.com", pseudo="signal_user")
        account = SocialAccount(user=user, provider="microsoft", extra_data={"id": "xuid_789", "displayName": "SignalGamer"})
        sociallogin = SocialLogin(user=user, account=account)

        # Trigger the signal manually
        social_account_added.send(sender=SocialLogin, request=MagicMock(), sociallogin=sociallogin)

        profile = XboxProfile.objects.get(user=user)
        assert profile.xbox_xuid == "xuid_789"
        assert profile.gamertag == "SignalGamer"


@pytest.mark.django_db
class TestSocialAccountAdapter:
    def test_populate_user_pseudo_from_extra_data(self):
        """
        Verify that pseudo is correctly populated from extra_data if available.
        """
        user = CustomUser(email="test@example.com")
        account = SocialAccount(provider="google", extra_data={"name": "Google User", "id": "123"})
        sociallogin = SocialLogin(user=user, account=account)

        adapter = SocialAccountAdapter()
        adapter.populate_user(MagicMock(), sociallogin, {"email": "test@example.com"})

        assert user.pseudo == "google-user"

    def test_populate_user_pseudo_already_exists(self):
        """
        Verify that populate_user does nothing if pseudo is already set.
        """
        user = CustomUser(email="test@example.com", pseudo="existing-pseudo")
        sociallogin = SocialLogin(user=user)
        adapter = SocialAccountAdapter()

        res = adapter.populate_user(MagicMock(), sociallogin, {})
        assert res.pseudo == "existing-pseudo"

    def test_populate_user_pseudo_from_email(self):
        """
        Verify that pseudo is populated from email if no names are available.
        """
        user = CustomUser()
        account = SocialAccount(provider="google", extra_data={})
        sociallogin = SocialLogin(user=user, account=account)
        adapter = SocialAccountAdapter()

        adapter.populate_user(MagicMock(), sociallogin, {"email": "user_from_email@example.com"})
        assert user.pseudo == "user_from_email"

    def test_populate_user_pseudo_from_id(self):
        """
        Verify that pseudo is populated from ID if no names and no email are available.
        """
        user = CustomUser()
        # On s'assure que super().populate_user ne met pas d'email ou de pseudo
        account = SocialAccount(provider="google", extra_data={"id": "123456"})
        sociallogin = SocialLogin(user=user, account=account)
        adapter = SocialAccountAdapter()

        adapter.populate_user(MagicMock(), sociallogin, {})
        assert user.pseudo == "123456"

    def test_populate_user_pseudo_default(self):
        """
        Verify that pseudo defaults to 'user' if everything else is missing.
        """
        user = CustomUser()
        account = SocialAccount(provider="google", extra_data={})
        sociallogin = SocialLogin(user=user, account=account)
        adapter = SocialAccountAdapter()

        adapter.populate_user(MagicMock(), sociallogin, {})
        assert user.pseudo == "user"


@pytest.mark.django_db
class TestSaveUser:
    """Tests for SocialAccountAdapter.save_user (allauth 65+ compat shim)."""

    def test_no_token_skips_upsert_and_calls_super(self):
        """If sociallogin.token is None, no DB work is done."""
        sociallogin = MagicMock()
        sociallogin.token = None

        with patch.object(DefaultSocialAccountAdapter, "save_user") as mock_super:
            SocialAccountAdapter().save_user(MagicMock(), sociallogin)

        mock_super.assert_called_once()

    def test_token_with_no_app_skips_upsert(self):
        """If token.app is None, no DB work is done."""
        sociallogin = MagicMock()
        sociallogin.token.app = None

        with patch.object(DefaultSocialAccountAdapter, "save_user") as mock_super:
            SocialAccountAdapter().save_user(MagicMock(), sociallogin)

        mock_super.assert_called_once()

    def test_app_with_pk_skips_upsert(self):
        """If token.app already has a PK it is in DB — no upsert needed."""
        from allauth.socialaccount.models import SocialApp

        sociallogin = MagicMock()
        sociallogin.token.app.pk = 99
        initial_count = SocialApp.objects.count()

        with patch.object(DefaultSocialAccountAdapter, "save_user") as mock_super:
            SocialAccountAdapter().save_user(MagicMock(), sociallogin)

        assert SocialApp.objects.count() == initial_count
        mock_super.assert_called_once()

    def test_creates_app_and_site_when_app_has_no_pk(self):
        """In-memory app (no PK) is persisted to DB and linked to the current site."""
        from allauth.socialaccount.models import SocialApp
        from django.contrib.sites.models import Site

        in_memory_app = MagicMock()
        in_memory_app.pk = None
        in_memory_app.provider = "google"
        in_memory_app.client_id = "test-client-id"
        in_memory_app.secret = "test-secret"
        in_memory_app.name = "Google"
        in_memory_app.key = ""

        sociallogin = MagicMock()
        sociallogin.token.app = in_memory_app

        with patch.object(DefaultSocialAccountAdapter, "save_user"):
            SocialAccountAdapter().save_user(MagicMock(), sociallogin)

        db_app = SocialApp.objects.get(provider="google", client_id="test-client-id")
        assert db_app.name == "Google"
        assert db_app.secret == "test-secret"
        assert Site.objects.get(pk=1) in db_app.sites.all()
        assert sociallogin.token.app == db_app

    def test_gets_existing_app_without_adding_site(self):
        """If the app already exists in DB, retrieve it without modifying its sites."""
        from allauth.socialaccount.models import SocialApp

        existing = SocialApp.objects.create(
            provider="google",
            client_id="existing-client-id",
            name="Google",
            secret="existing-secret",
        )

        in_memory_app = MagicMock()
        in_memory_app.pk = None
        in_memory_app.provider = "google"
        in_memory_app.client_id = "existing-client-id"
        in_memory_app.secret = "existing-secret"
        in_memory_app.name = "Google"
        in_memory_app.key = ""

        sociallogin = MagicMock()
        sociallogin.token.app = in_memory_app

        with patch.object(DefaultSocialAccountAdapter, "save_user"):
            SocialAccountAdapter().save_user(MagicMock(), sociallogin)

        assert SocialApp.objects.filter(provider="google", client_id="existing-client-id").count() == 1
        assert sociallogin.token.app == existing
        assert existing.sites.count() == 0

    def test_fallback_name_from_provider_title_when_name_is_none(self):
        """When app_cfg.name is None, falls back to provider.title() as app name."""
        from allauth.socialaccount.models import SocialApp

        in_memory_app = MagicMock()
        in_memory_app.pk = None
        in_memory_app.provider = "google"
        in_memory_app.client_id = "no-name-client"
        in_memory_app.secret = "secret"
        in_memory_app.name = None
        in_memory_app.key = None

        sociallogin = MagicMock()
        sociallogin.token.app = in_memory_app

        with patch.object(DefaultSocialAccountAdapter, "save_user"):
            SocialAccountAdapter().save_user(MagicMock(), sociallogin)

        db_app = SocialApp.objects.get(provider="google", client_id="no-name-client")
        assert db_app.name == "Google"


class TestLudokanAccountAdapter:
    """Unit tests for LudokanAccountAdapter.send_mail."""

    def test_send_mail_with_request_applies_language(self):
        """When request is present and get_language_from_request succeeds, send_mail uses its language."""
        adapter = LudokanAccountAdapter()
        mock_request = MagicMock()

        with (
            patch("apps.users.adapters.translation.get_language_from_request", return_value="fr") as mock_get_lang,
            patch("apps.users.adapters.translation.override") as mock_override,
            patch.object(adapter.__class__.__bases__[0], "send_mail"),
        ):
            mock_override.return_value.__enter__ = MagicMock(return_value=None)
            mock_override.return_value.__exit__ = MagicMock(return_value=False)
            adapter.send_mail("prefix", "test@example.com", {"request": mock_request})

        mock_get_lang.assert_called_once_with(mock_request)
        mock_override.assert_called_once_with("fr")

    def test_send_mail_falls_back_to_language_code_on_exception(self):
        """When get_language_from_request raises, send_mail falls back to LANGUAGE_CODE."""
        adapter = LudokanAccountAdapter()
        mock_request = MagicMock()

        with (
            patch("apps.users.adapters.translation.get_language_from_request", side_effect=Exception("lang error")),
            patch("apps.users.adapters.translation.get_language", return_value=None),
            patch("apps.users.adapters.translation.override") as mock_override,
            patch("apps.users.adapters.django_settings") as mock_settings,
            patch.object(adapter.__class__.__bases__[0], "send_mail"),
        ):
            mock_settings.LANGUAGE_CODE = "en"
            mock_settings.FRONTEND_BASE_URL = "http://localhost:5173"
            mock_override.return_value.__enter__ = MagicMock(return_value=None)
            mock_override.return_value.__exit__ = MagicMock(return_value=False)
            adapter.send_mail("prefix", "test@example.com", {"request": mock_request})

        # Fallback language (LANGUAGE_CODE = "en") should be used
        mock_override.assert_called_once_with("en")

    def test_send_mail_without_request_calls_super_directly(self):
        """When no request is in context, send_mail calls super directly."""
        adapter = LudokanAccountAdapter()

        with patch.object(adapter.__class__.__bases__[0], "send_mail") as mock_super:
            adapter.send_mail("prefix", "test@example.com", {})

        mock_super.assert_called_once()

    def test_get_email_confirmation_url_uses_frontend_base(self, settings):
        settings.FRONTEND_BASE_URL = "https://spa.example.com/"
        adapter = LudokanAccountAdapter()
        emailconfirmation = MagicMock()
        emailconfirmation.key = "signed-key-abc"
        url = adapter.get_email_confirmation_url(None, emailconfirmation)
        assert url.startswith("https://spa.example.com/verify-email/signed-key-abc")
        assert "lang=" in url

    def test_get_reset_password_from_key_url_splits_opaque_key(self, settings):
        settings.FRONTEND_BASE_URL = "https://spa.example.com"
        adapter = LudokanAccountAdapter()
        url = adapter.get_reset_password_from_key_url("uidb64part-token-with-dashes")
        assert url.startswith("https://spa.example.com/reset-password/uidb64part/token-with-dashes")
        assert "lang=" in url

    def test_get_reset_password_from_key_url_without_dash_calls_super(self):
        """When key has no dash, fallback to super().get_reset_password_from_key_url."""
        adapter = LudokanAccountAdapter()
        with patch("apps.users.adapters.DefaultAccountAdapter.get_reset_password_from_key_url", return_value="/default-reset/key") as mock_super:
            url = adapter.get_reset_password_from_key_url("nodashkey")
            assert "/default-reset/key" in url
            mock_super.assert_called_once_with("nodashkey")

    def test_get_reset_password_from_key_url_with_existing_query_params(self):
        """When the base URL already has query params, use '&' as separator for lang."""
        adapter = LudokanAccountAdapter()
        with patch("apps.users.adapters.DefaultAccountAdapter.get_reset_password_from_key_url", return_value="/reset?token=123"):
            url = adapter.get_reset_password_from_key_url("nodashkey")
            assert "/reset?token=123&lang=" in url
