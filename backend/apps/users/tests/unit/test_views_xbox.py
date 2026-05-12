"""Couverture exhaustive de apps.users.views_xbox (APIRequestFactory : évite le chargement urlconf)."""

from unittest.mock import MagicMock, patch

import pytest
import requests
from allauth.socialaccount.models import SocialAccount, SocialToken
from django.contrib.auth import get_user_model
from django.core import signing
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.models import XboxProfile
from apps.users.views_xbox import XboxConnectCallbackView, XboxConnectInitiateView, XboxDisconnectView

User = get_user_model()


@pytest.fixture
def xbox_user(db):
    return User.objects.create_user(
        email="xbox_t@example.com",
        pseudo="xbox_tester",
        password="password123",
    )


@pytest.fixture
def factory():
    return APIRequestFactory()


def _state_for(user_id: int) -> str:
    return signing.dumps({"uid": user_id}, salt="xbox-connect-state")


def _initiate(factory, user=None):
    request = factory.get("/")
    if user is not None:
        force_authenticate(request, user=user)
    return XboxConnectInitiateView.as_view()(request)


def _callback(factory, user, data):
    request = factory.post("/", data, format="json")
    force_authenticate(request, user=user)
    return XboxConnectCallbackView.as_view()(request)


def _disconnect(factory, user=None):
    request = factory.delete("/")
    if user is not None:
        force_authenticate(request, user=user)
    return XboxDisconnectView.as_view()(request)


@pytest.mark.django_db
class TestXboxConnectInitiateView:
    def test_missing_client_id_returns_500(self, factory, xbox_user):
        with override_settings(MICROSOFT_CLIENT_ID=""):
            response = _initiate(factory, xbox_user)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert "MICROSOFT_CLIENT_ID" in response.data.get("detail", "")

    @override_settings(MICROSOFT_CLIENT_ID="test-client-id", FRONTEND_BASE_URL="http://localhost:5173")
    def test_returns_auth_url(self, factory, xbox_user):
        response = _initiate(factory, xbox_user)
        assert response.status_code == status.HTTP_200_OK
        assert "auth_url" in response.data
        url = response.data["auth_url"]
        assert "login.microsoftonline.com" in url
        assert "client_id=test-client-id" in url
        assert "state=" in url

    def test_requires_auth(self, factory):
        response = _initiate(factory, None)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestXboxConnectCallbackView:
    def test_missing_code(self, factory, xbox_user):
        r = _callback(factory, xbox_user, {"state": _state_for(1)})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_state(self, factory, xbox_user):
        r = _callback(factory, xbox_user, {"code": "abc"})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_bad_signature(self, factory, xbox_user):
        r = _callback(factory, xbox_user, {"code": "abc", "state": "not-a-signature"})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_state_wrong_user(self, factory, xbox_user):
        state = _state_for(999999999)
        r = _callback(factory, xbox_user, {"code": "abc", "state": state})
        assert r.status_code == status.HTTP_403_FORBIDDEN

    @override_settings(MICROSOFT_CLIENT_ID="", MICROSOFT_CLIENT_SECRET="sec")
    def test_exchange_config_missing_client_id(self, factory, xbox_user):
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="")
    def test_exchange_config_missing_secret(self, factory, xbox_user):
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.post")
    def test_token_exchange_request_exception(self, mock_post, factory, xbox_user):
        mock_post.side_effect = requests.RequestException("network")
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_502_BAD_GATEWAY

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.post")
    def test_token_exchange_non_200(self, mock_post, factory, xbox_user):
        mock_post.return_value = MagicMock(status_code=400, text="err")
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.post")
    def test_token_exchange_missing_access_token(self, mock_post, factory, xbox_user):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {})
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.get")
    @patch("apps.users.views_xbox.requests.post")
    def test_profile_request_exception(self, mock_post, mock_get, factory, xbox_user):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "at", "expires_in": 3600})
        mock_get.side_effect = requests.RequestException("network")
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_502_BAD_GATEWAY

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.get")
    @patch("apps.users.views_xbox.requests.post")
    def test_profile_non_200(self, mock_post, mock_get, factory, xbox_user):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "at"})
        mock_get.return_value = MagicMock(status_code=500, text="graph err")
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.get")
    @patch("apps.users.views_xbox.requests.post")
    def test_profile_missing_id(self, mock_post, mock_get, factory, xbox_user):
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "at"})
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"displayName": "N"})
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.get")
    @patch("apps.users.views_xbox.requests.post")
    def test_conflict_other_user_has_microsoft_uid(self, mock_post, mock_get, factory, xbox_user):
        other = User.objects.create_user(email="oth@ex.com", pseudo="othx", password="password123")
        SocialAccount.objects.create(user=other, provider="microsoft", uid="same-xuid", extra_data={})
        mock_post.return_value = MagicMock(status_code=200, json=lambda: {"access_token": "at"})
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"id": "same-xuid", "displayName": "X"})
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_409_CONFLICT

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.get")
    @patch("apps.users.views_xbox.requests.post")
    def test_success_creates_token_and_profile_no_expires_in(self, mock_post, mock_get, factory, xbox_user):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"access_token": "acc", "refresh_token": "ref"},
        )
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"id": "xuid-new", "displayName": "Gamer"})
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["xuid"] == "xuid-new"
        assert SocialToken.objects.filter(token="acc").exists()
        assert XboxProfile.objects.get(user=xbox_user).xbox_xuid == "xuid-new"

    @override_settings(MICROSOFT_CLIENT_ID="cid", MICROSOFT_CLIENT_SECRET="sec", FRONTEND_BASE_URL="http://app.test")
    @patch("apps.users.views_xbox.requests.get")
    @patch("apps.users.views_xbox.requests.post")
    def test_success_updates_existing_token(self, mock_post, mock_get, factory, xbox_user):
        acc, _ = SocialAccount.objects.get_or_create(
            user=xbox_user,
            provider="microsoft",
            defaults={"uid": "old", "extra_data": {}},
        )
        acc.uid = "old"
        acc.save()
        t1 = SocialToken.objects.create(account=acc, app=None, token="old", token_secret="")

        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"access_token": "newtok", "refresh_token": "newref", "expires_in": 7200},
        )
        mock_get.return_value = MagicMock(status_code=200, json=lambda: {"id": "xuid-upd", "displayName": "Upd"})
        state = _state_for(xbox_user.pk)
        r = _callback(factory, xbox_user, {"code": "c1", "state": state})
        assert r.status_code == status.HTTP_200_OK
        t1.refresh_from_db()
        assert t1.token == "newtok"
        assert SocialToken.objects.filter(account=acc).count() == 1


@pytest.mark.django_db
class TestXboxDisconnectView:
    def test_204_when_linked(self, factory, xbox_user):
        XboxProfile.objects.create(user=xbox_user, xbox_xuid="x", gamertag="g")
        r = _disconnect(factory, xbox_user)
        assert r.status_code == status.HTTP_204_NO_CONTENT
        assert not XboxProfile.objects.filter(user=xbox_user).exists()

    def test_404_when_not_linked(self, factory, xbox_user):
        r = _disconnect(factory, xbox_user)
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_requires_auth(self, factory):
        r = _disconnect(factory, None)
        assert r.status_code == status.HTTP_401_UNAUTHORIZED
