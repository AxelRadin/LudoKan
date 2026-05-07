from unittest.mock import MagicMock

import pytest
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
