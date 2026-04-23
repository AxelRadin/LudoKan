"""
Tests pour apps.users.adapters (inscription sociale / pseudo unique).
"""

from types import SimpleNamespace
from unittest.mock import patch

import pytest
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.test import RequestFactory

from apps.users.adapters import SocialAccountAdapter
from apps.users.models import CustomUser


def _sociallogin(extra_data=None, with_account=True):
    if not with_account:
        return SimpleNamespace()
    return SimpleNamespace(account=SimpleNamespace(extra_data=extra_data or {}))


@pytest.mark.django_db
class TestSocialAccountAdapter:
    @pytest.fixture
    def adapter(self):
        return SocialAccountAdapter()

    @pytest.fixture
    def django_request(self):
        return RequestFactory().get("/")

    @staticmethod
    def _fresh_user(email="", pseudo=""):
        return CustomUser(email=email, pseudo=pseudo)

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_keeps_existing_pseudo(self, mock_super, adapter, django_request):
        user = self._fresh_user(email="a@b.com", pseudo="already")
        mock_super.return_value = user
        out = adapter.populate_user(django_request, _sociallogin({"name": "Ignored"}), {})
        assert out.pseudo == "already"
        mock_super.assert_called_once()

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_generates_from_name_extra(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="g@example.com", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({"name": "Jean Dupont", "email": "g@example.com"}),
            {},
        )
        assert out.pseudo == "jean-dupont"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_generates_from_given_name_when_no_name(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="g@example.com", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({"given_name": "  Marie  "}),
            {},
        )
        assert out.pseudo == "marie"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_generates_from_nickname(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="g@example.com", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({"nickname": "nick_one"}),
            {},
        )
        assert out.pseudo == "nick_one"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_generates_from_email_local_part(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({}),
            {"email": "partie-locale@example.com"},
        )
        assert out.pseudo == "partie-locale"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_generates_from_user_email_when_data_empty(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="fromuser@example.com", pseudo="")
        out = adapter.populate_user(django_request, _sociallogin({}), {})
        assert out.pseudo == "fromuser"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_fallback_sub(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({"sub": "google-sub-123"}),
            {},
        )
        assert out.pseudo == "google-sub-123"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_fallback_id_when_no_sub(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({"id": "openid-xyz"}),
            {},
        )
        assert out.pseudo == "openid-xyz"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_fallback_user_when_no_seed(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="", pseudo="")
        out = adapter.populate_user(django_request, _sociallogin({}), {})
        assert out.pseudo == "user"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_no_account_attr_uses_data_email(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="", pseudo="")
        sociallogin = _sociallogin(with_account=False)
        out = adapter.populate_user(
            django_request,
            sociallogin,
            {"email": "only@data.com"},
        )
        assert out.pseudo == "only"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_whitespace_only_pseudo_regenerated(self, mock_super, adapter, django_request):
        mock_super.return_value = self._fresh_user(email="x@y.com", pseudo="   ")
        out = adapter.populate_user(django_request, _sociallogin({}), {})
        assert out.pseudo == "x"

    @patch.object(DefaultSocialAccountAdapter, "populate_user")
    def test_collision_appends_suffix(self, mock_super, adapter, django_request):
        CustomUser.objects.create_user(
            email="existing@example.com",
            password="x",
            pseudo="hello-world",
        )
        mock_super.return_value = self._fresh_user(email="new@example.com", pseudo="")
        out = adapter.populate_user(
            django_request,
            _sociallogin({"name": "Hello World"}),
            {},
        )
        assert out.pseudo == "hello-world1"
