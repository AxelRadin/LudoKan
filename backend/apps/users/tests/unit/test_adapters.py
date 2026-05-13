from unittest.mock import MagicMock, patch

import pytest
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.models import SocialAccount, SocialLogin
from allauth.socialaccount.signals import social_account_added

from apps.users.adapters import SocialAccountAdapter
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
