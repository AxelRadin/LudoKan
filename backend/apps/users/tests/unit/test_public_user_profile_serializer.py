"""Couverture de PublicUserProfileSerializer (URLs médias, stats ludothèque, relation / demandes)."""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.games.models import Game
from apps.library.models import UserGame, UserLibrary, UserLibraryEntry
from apps.social.models import FriendRequest, Friendship
from apps.users.models import SteamProfile, XboxProfile
from apps.users.serializers import PublicUserProfileSerializer

User = get_user_model()


@pytest.fixture
def second_game(db, publisher, genre, platform):
    g = Game.objects.create(
        igdb_id=5002,
        name="Second Game",
        description="Second",
        publisher=publisher,
    )
    g.genres.add(genre)
    g.platforms.add(platform)
    return g


@pytest.mark.django_db
class TestPublicUserProfileSerializerMediaAndPlatforms:
    def test_avatar_and_banner_absolute_urls(self, user, rf):
        user.avatar = SimpleUploadedFile("av.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.banner = SimpleUploadedFile("bn.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.save()
        request = rf.get("/")
        request.user = user
        ser = PublicUserProfileSerializer(instance=user, context={"request": request})
        assert ser.data["avatar_url"].startswith("http")
        assert ser.data["banner_url"].startswith("http")

    def test_avatar_banner_none_without_request(self, user):
        user.avatar = SimpleUploadedFile("a2.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.banner = SimpleUploadedFile("b2.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.save()
        ser = PublicUserProfileSerializer(instance=user, context={})
        assert ser.data["avatar_url"] is None
        assert ser.data["banner_url"] is None

    def test_steam_xbox_visible_for_self(self, user, rf):
        SteamProfile.objects.create(user=user, steam_id="steamvis")
        XboxProfile.objects.create(user=user, xbox_xuid="xuidvis", gamertag="GT")
        request = rf.get("/")
        request.user = user
        ser = PublicUserProfileSerializer(instance=user, context={"request": request})
        assert ser.data["steam_id"] == "steamvis"
        assert ser.data["xbox_profile"]["gamertag"] == "GT"

    def test_steam_xbox_hidden_for_stranger(self, user, rf):
        stranger = User.objects.create_user(email="st@ex.com", pseudo="strsteam", password="x" * 8 + "1Aa")
        SteamProfile.objects.create(user=stranger, steam_id="hideme")
        XboxProfile.objects.create(user=stranger, xbox_xuid="hidex", gamertag="H")
        request = rf.get("/")
        request.user = user
        ser = PublicUserProfileSerializer(instance=stranger, context={"request": request})
        assert ser.data["steam_id"] is None
        assert ser.data["xbox_profile"] is None

    def test_steam_xbox_visible_for_friend(self, user, rf, game):
        owner = User.objects.create_user(email="ow@ex.com", pseudo="platown", password="x" * 8 + "1Aa")
        SteamProfile.objects.create(user=owner, steam_id="friendsteam")
        XboxProfile.objects.create(user=owner, xbox_xuid="friendx", gamertag="FGT")
        ua, ub = sorted([user.pk, owner.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        pub = UserLibrary.objects.create(user=owner, name="Pub", is_visible_on_profile=True)
        ug = UserGame.objects.create(user=owner, game=game, status=UserGame.GameStatus.EN_COURS)
        UserLibraryEntry.objects.create(library=pub, user_game=ug)
        request = rf.get("/")
        request.user = user
        ser = PublicUserProfileSerializer(instance=owner, context={"request": request})
        assert ser.data["steam_id"] == "friendsteam"
        assert ser.data["xbox_profile"]["gamertag"] == "FGT"


@pytest.mark.django_db
class TestPublicUserProfileSerializerStats:
    def test_playtime_and_percentages_with_visible_games(self, user, rf, game, second_game):
        """Deux jeux visibles : stats agrégées et branches total > 0."""
        g2 = second_game
        pub = UserLibrary.objects.create(user=user, name="Pub", is_visible_on_profile=True)
        ug1 = UserGame.objects.create(
            user=user,
            game=game,
            status=UserGame.GameStatus.TERMINE,
            playtime_forever=10.0,
        )
        ug2 = UserGame.objects.create(
            user=user,
            game=g2,
            status=UserGame.GameStatus.EN_COURS,
            playtime_forever=5.0,
        )
        UserLibraryEntry.objects.create(library=pub, user_game=ug1)
        UserLibraryEntry.objects.create(library=pub, user_game=ug2)
        request = rf.get("/")
        request.user = user
        ser = PublicUserProfileSerializer(instance=user, context={"request": request})
        assert ser.data["total_playtime"] == 15.0
        assert ser.data["total_games_count"] == 2
        assert ser.data["games_finished_percentage"] == 50.0
        assert ser.data["games_played_percentage"] == 100.0


@pytest.mark.django_db
class TestPublicUserProfileSerializerRelationAndRequests:
    def test_relation_to_me_none_when_anonymous(self, user, rf):
        request = rf.get("/")
        request.user = type("Anon", (), {"is_authenticated": False})()
        ser = PublicUserProfileSerializer(instance=user, context={"request": request})
        assert ser.data["relation_to_me"] is None

    def test_relation_to_me_friends(self, user, rf):
        other = User.objects.create_user(email="rel@ex.com", pseudo="relmate", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        request = rf.get("/")
        request.user = user
        ser = PublicUserProfileSerializer(instance=other, context={"request": request})
        assert ser.data["relation_to_me"] == "friends"

    def test_incoming_and_outgoing_friend_request_ids(self, user, rf):
        a = user
        b = User.objects.create_user(email="ifr@ex.com", pseudo="reqmate", password="x" * 8 + "1Aa")
        fr_in = FriendRequest.objects.create(from_user=b, to_user=a, status=FriendRequest.Status.PENDING)
        fr_out = FriendRequest.objects.create(from_user=a, to_user=b, status=FriendRequest.Status.PENDING)
        request = rf.get("/")
        request.user = a
        ser = PublicUserProfileSerializer(instance=b, context={"request": request})
        assert ser.data["incoming_friend_request_id"] == fr_in.pk
        assert ser.data["outgoing_friend_request_id"] == fr_out.pk

    def test_friend_request_ids_none_without_viewer(self, user, rf):
        other = User.objects.create_user(email="nv@ex.com", pseudo="noview", password="x" * 8 + "1Aa")
        FriendRequest.objects.create(from_user=other, to_user=user, status=FriendRequest.Status.PENDING)
        request = rf.get("/")
        request.user = type("Anon", (), {"is_authenticated": False})()
        ser = PublicUserProfileSerializer(instance=other, context={"request": request})
        assert ser.data["incoming_friend_request_id"] is None
        assert ser.data["outgoing_friend_request_id"] is None
