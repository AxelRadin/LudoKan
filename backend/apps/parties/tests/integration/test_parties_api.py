from datetime import timedelta
from unittest.mock import PropertyMock, patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.parties.models import GameParty, GamePartyMember
from apps.parties.tests.conftest import open_party_factory, party_member_create


@pytest.mark.django_db
class TestPartyJoinOrCreateAPI:
    def test_requires_authentication(self, api_client, game):
        response = api_client.post(
            "/api/parties/join-or-create",
            {"game": game.id},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_returns_200_with_party_payload(self, authenticated_api_client, game):
        response = authenticated_api_client.post(
            "/api/parties/join-or-create",
            {"game": game.id, "max_players": 4},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "id" in data
        assert data["status"] == GameParty.Status.OPEN
        assert data["game"] == game.id
        assert "chat_room_id" in data
        assert data["chat_room_id"] is None
        assert isinstance(data["members"], list)
        assert len(data["members"]) >= 1
        assert "user_id" in data["members"][0]

    def test_second_user_joins_existing_open_party(self, authenticated_api_client, another_user, game):
        r1 = authenticated_api_client.post(
            "/api/parties/join-or-create",
            {"game": game.id, "max_players": 5},
            format="json",
        )
        pid = r1.data["id"]

        client_b = APIClient()
        client_b.force_authenticate(user=another_user)
        r2 = client_b.post(
            "/api/parties/join-or-create",
            {"game": game.id, "max_players": 5},
            format="json",
        )
        assert r2.status_code == status.HTTP_200_OK
        assert r2.data["id"] == pid


@pytest.mark.django_db
class TestPartyMeActiveAPI:
    def test_returns_404_when_no_active_party(self, authenticated_api_client):
        r = authenticated_api_client.get("/api/parties/me/active")
        assert r.status_code == status.HTTP_404_NOT_FOUND

    def test_returns_most_recently_updated_party(self, authenticated_api_client, user, game):
        older = open_party_factory(game=game, max_players=4)
        party_member_create(party=older, user=user)
        GameParty.objects.filter(pk=older.id).update(updated_at=timezone.now() - timedelta(days=2))

        newer = open_party_factory(game=game, max_players=4)
        party_member_create(party=newer, user=user)
        GameParty.objects.filter(pk=newer.id).update(updated_at=timezone.now())

        r = authenticated_api_client.get("/api/parties/me/active")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["id"] == newer.id

    def test_lazy_opens_chat_when_countdown_expired(self, authenticated_api_client, user, another_user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        r = authenticated_api_client.get("/api/parties/me/active")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["status"] == GameParty.Status.CHAT_ACTIVE
        assert r.data["chat_room_id"] is not None


@pytest.mark.django_db
class TestPartyDetailAPI:
    def test_member_flow_gets_200(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4)
        party_member_create(party=party, user=user)
        r = authenticated_api_client.get(f"/api/parties/{party.id}")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["id"] == party.id
        assert "members" in r.data

    def test_non_member_gets_403(self, another_user, user, game):
        party = open_party_factory(game=game, max_players=4)
        party_member_create(party=party, user=user)
        client_other = APIClient()
        client_other.force_authenticate(user=another_user)
        r = client_other.get(f"/api/parties/{party.id}")
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_lazy_open_chat_on_detail(self, authenticated_api_client, user, another_user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.COUNTDOWN)
        party.countdown_ends_at = timezone.now() - timedelta(seconds=1)
        party.save(update_fields=["countdown_ends_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        r = authenticated_api_client.get(f"/api/parties/{party.id}")
        assert r.status_code == status.HTTP_200_OK
        assert r.data["status"] == GameParty.Status.CHAT_ACTIVE
        assert r.data["chat_room_id"] is not None


@pytest.mark.django_db
class TestPartyReadyAPI:
    def test_ready_updates_state(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user)

        r = authenticated_api_client.post(f"/api/parties/{party.id}/ready", {"accepted": True}, format="json")
        assert r.status_code == status.HTTP_200_OK
        m = GamePartyMember.objects.get(party=party, user=user)
        assert m.ready_state == GamePartyMember.ReadyState.ACCEPTED

    def test_ready_returns_400_when_wrong_status(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
        party_member_create(party=party, user=user)
        r = authenticated_api_client.post(f"/api/parties/{party.id}/ready", {"accepted": True}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPartyReadyForChatAPI:
    def test_ready_for_chat_updates_state(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY_FOR_CHAT)
        party.ready_for_chat_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_for_chat_deadline_at"])
        party_member_create(
            party=party,
            user=user,
            ready_state=GamePartyMember.ReadyState.ACCEPTED,
            ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
        )
        r = authenticated_api_client.post(
            f"/api/parties/{party.id}/ready-for-chat",
            {"accepted": True},
            format="json",
        )
        assert r.status_code == status.HTTP_200_OK
        m = GamePartyMember.objects.get(party=party, user=user)
        assert m.ready_for_chat_state == GamePartyMember.ReadyForChatState.ACCEPTED

    def test_ready_for_chat_returns_400_when_wrong_status(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
        party_member_create(party=party, user=user)
        r = authenticated_api_client.post(
            f"/api/parties/{party.id}/ready-for-chat",
            {"accepted": True},
            format="json",
        )
        assert r.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestPartyLeaveAPI:
    def test_first_leave_returns_200(self, authenticated_api_client, user, another_user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user)
        party_member_create(party=party, user=another_user)

        r = authenticated_api_client.post(f"/api/parties/{party.id}/leave", {}, format="json")
        assert r.status_code == status.HTTP_200_OK

    def test_second_leave_returns_403(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
        party.ready_deadline_at = timezone.now() + timedelta(hours=1)
        party.save(update_fields=["ready_deadline_at"])
        party_member_create(party=party, user=user)

        authenticated_api_client.post(f"/api/parties/{party.id}/leave", {}, format="json")
        r2 = authenticated_api_client.post(f"/api/parties/{party.id}/leave", {}, format="json")
        assert r2.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_cannot_act_for_another_user_via_ready(authenticated_api_client, user, another_user, game):
    party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
    party.ready_deadline_at = timezone.now() + timedelta(hours=1)
    party.save(update_fields=["ready_deadline_at"])
    party_member_create(party=party, user=user)
    party_member_create(party=party, user=another_user)

    r = authenticated_api_client.post(f"/api/parties/{party.id}/ready", {"accepted": True}, format="json")
    assert r.status_code == status.HTTP_200_OK
    other = GamePartyMember.objects.get(party=party, user=another_user)
    assert other.ready_state == GamePartyMember.ReadyState.PENDING


@pytest.mark.django_db
class TestPartyStartEarlyAPI:
    def test_start_early_updates_state(self, authenticated_api_client, user, game):
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.OPEN)
        party_member_create(party=party, user=user)

        r = authenticated_api_client.post(f"/api/parties/{party.id}/start-early", {"accepted": True}, format="json")
        assert r.status_code == status.HTTP_200_OK
        m = GamePartyMember.objects.get(party=party, user=user)
        assert m.wants_to_start_early is True

    def test_start_early_returns_400_on_service_error(self, authenticated_api_client, user, game):
        # Party in WAITING_READY status (not OPEN)
        party = open_party_factory(game=game, max_players=4, status=GameParty.Status.WAITING_READY)
        # User is an active member (passes permission check)
        party_member_create(party=party, user=user)

        r = authenticated_api_client.post(f"/api/parties/{party.id}/start-early", {"accepted": True}, format="json")
        assert r.status_code == status.HTTP_400_BAD_REQUEST
        assert "detail" in r.data


@pytest.mark.django_db
class TestPartyAvatarCoverage:
    def test_external_avatar_url(self, authenticated_api_client, user, game):
        """Test que l'avatar externe est utilisé s'il n'y a pas d'image locale."""
        user.avatar_url = "https://example.com/avatar.png"
        user.save()
        party = open_party_factory(game=game, max_players=4)
        party_member_create(party=party, user=user)

        r = authenticated_api_client.get("/api/parties/me/active")
        assert r.status_code == status.HTTP_200_OK

        member_data = next(m for m in r.data["members"] if m["user_id"] == user.id)
        assert member_data["avatar_url"] == "https://example.com/avatar.png"

    def test_local_avatar_success(self, authenticated_api_client, user, game):
        """Test qu'un avatar local uploadé génère bien une URL absolue."""
        avatar_file = SimpleUploadedFile("test_avatar.png", b"file_content", content_type="image/png")
        user.avatar = avatar_file
        user.save()

        party = open_party_factory(game=game, max_players=4)
        party_member_create(party=party, user=user)

        r = authenticated_api_client.get("/api/parties/me/active")
        assert r.status_code == status.HTTP_200_OK

        member_data = next(m for m in r.data["members"] if m["user_id"] == user.id)
        assert member_data["avatar_url"] is not None
        assert "test_avatar" in member_data["avatar_url"]
        assert member_data["avatar_url"].startswith("http")

    def test_avatar_exception_fallback(self, authenticated_api_client, user, game):
        """Test que si l'accès à l'avatar local crashe, le try/except rattrape l'erreur."""
        user.avatar_url = "https://example.com/fallback.png"
        user.save()

        party = open_party_factory(game=game, max_players=4)
        party_member_create(party=party, user=user)

        with patch("apps.users.models.CustomUser.avatar", new_callable=PropertyMock) as mock_avatar:
            mock_avatar.side_effect = Exception("Erreur de stockage simulée !")

            r = authenticated_api_client.get("/api/parties/me/active")

        assert r.status_code == status.HTTP_200_OK
        member_data = next(m for m in r.data["members"] if m["user_id"] == user.id)
        assert member_data["avatar_url"] == "https://example.com/fallback.png"
