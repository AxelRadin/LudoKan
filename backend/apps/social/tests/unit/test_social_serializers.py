"""Tests unitaires pour apps.social.serializers."""

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.social.serializers import BlockUserCreateSerializer, FriendMiniSerializer, FriendRequestCreateSerializer, FriendshipFriendSerializer

User = get_user_model()


@pytest.mark.django_db
class TestFriendMiniSerializer:
    def test_avatar_url_with_request(self, user, rf):
        user.avatar = SimpleUploadedFile("a.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.save()
        request = rf.get("/")
        ser = FriendMiniSerializer(instance=user, context={"request": request})
        assert ser.data["avatar_url"].startswith("http")

    def test_avatar_url_none_without_file(self, user, rf):
        request = rf.get("/")
        ser = FriendMiniSerializer(instance=user, context={"request": request})
        assert ser.data["avatar_url"] is None

    def test_avatar_url_none_without_request_context(self, user):
        user.avatar = SimpleUploadedFile("b.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.save()
        ser = FriendMiniSerializer(instance=user, context={})
        assert ser.data["avatar_url"] is None


@pytest.mark.django_db
class TestFriendRequestCreateSerializer:
    def test_validate_requires_target(self):
        ser = FriendRequestCreateSerializer(data={})
        assert not ser.is_valid()
        assert "non_field_errors" in ser.errors

    def test_validate_both_targets_rejected(self, user):
        ser = FriendRequestCreateSerializer(data={"to_user_id": user.pk, "to_pseudo": "x"})
        assert not ser.is_valid()

    def test_resolve_by_pseudo_case_insensitive(self, user):
        ser = FriendRequestCreateSerializer(data={"to_pseudo": user.pseudo.upper()})
        assert ser.is_valid(), ser.errors
        assert ser.resolve_to_user().pk == user.pk

    def test_resolve_by_user_id(self, user):
        ser = FriendRequestCreateSerializer(data={"to_user_id": user.pk})
        assert ser.is_valid(), ser.errors
        assert ser.resolve_to_user().pk == user.pk


@pytest.mark.django_db
class TestFriendshipFriendSerializer:
    def test_friends_count(self, user, rf):
        from apps.social.models import Friendship

        other = User.objects.create_user(email="fc@ex.com", pseudo="fcnt", password="x" * 8 + "1Aa")
        ua, ub = sorted([user.pk, other.pk])
        Friendship.objects.create(user_a_id=ua, user_b_id=ub)
        request = rf.get("/")
        ser = FriendshipFriendSerializer(instance=other, context={"request": request})
        assert ser.data["friends_count"] >= 1

    def test_avatar_url_with_request(self, user, rf):
        user.avatar = SimpleUploadedFile("c.png", b"\x89PNG\r\n\x1a\n", content_type="image/png")
        user.save()
        request = rf.get("/")
        ser = FriendshipFriendSerializer(instance=user, context={"request": request})
        assert ser.data["avatar_url"].startswith("http")


@pytest.mark.django_db
class TestBlockUserCreateSerializer:
    def test_validate_requires_identifier(self):
        ser = BlockUserCreateSerializer(data={})
        assert not ser.is_valid()
        assert "non_field_errors" in ser.errors

    def test_validate_both_rejected(self, user):
        ser = BlockUserCreateSerializer(data={"user_id": user.pk, "pseudo": "a"})
        assert not ser.is_valid()

    def test_resolve_by_pseudo(self, user):
        ser = BlockUserCreateSerializer(data={"pseudo": user.pseudo})
        assert ser.is_valid(), ser.errors
        assert ser.resolve_blocked_user().pk == user.pk

    def test_resolve_by_user_id(self, user):
        ser = BlockUserCreateSerializer(data={"user_id": user.pk})
        assert ser.is_valid(), ser.errors
        assert ser.resolve_blocked_user().pk == user.pk
