import pytest
from notifications.models import Notification
from notifications.signals import notify
from rest_framework import status


@pytest.mark.django_db
class TestNotificationAPI:
    """
    Tests d'intégration pour l'API des notifications :
    - GET /api/notifications          : liste paginée
    - PATCH /api/notifications/{id}/  : marquer comme lue / non-lue
    """

    def _create_notifications_for_users(self, user, other_user):
        notify.send(user, recipient=user, verb="notif-user-1")
        notify.send(user, recipient=user, verb="notif-user-2")

        notify.send(other_user, recipient=other_user, verb="notif-other")

    def test_list_notifications_returns_only_current_user_notifications_paginated(
        self,
        authenticated_api_client,
        user,
        admin_user,
    ):
        self._create_notifications_for_users(user, admin_user)

        url = "/api/notifications/"
        response = authenticated_api_client.get(url)

        assert response.status_code == status.HTTP_200_OK

        assert "results" in response.data
        verbs = {item["verb"] for item in response.data["results"]}
        assert "notif-user-1" in verbs
        assert "notif-user-2" in verbs
        assert "notif-other" not in verbs

    def test_list_notifications_requires_authentication(self, api_client):
        url = "/api/notifications/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_notification_marks_as_read_for_owner(self, authenticated_api_client, user):
        notify.send(user, recipient=user, verb="notif-to-read")
        notification = Notification.objects.get(recipient=user, verb="notif-to-read")

        url = f"/api/notifications/{notification.id}/"
        response = authenticated_api_client.patch(url, {"unread": False}, format="json")

        assert response.status_code == status.HTTP_200_OK
        notification.refresh_from_db()
        assert notification.unread is False

    def test_patch_notification_for_other_user_returns_404(
        self,
        authenticated_api_client,
        admin_user,
    ):
        # Notification admin_user
        notify.send(admin_user, recipient=admin_user, verb="admin-notif")
        notification = Notification.objects.get(recipient=admin_user, verb="admin-notif")

        url = f"/api/notifications/{notification.id}/"
        response = authenticated_api_client.patch(url, {"unread": False}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_patch_unknown_notification_returns_404(self, authenticated_api_client):
        url = "/api/notifications/999999/"
        response = authenticated_api_client.patch(url, {"unread": False}, format="json")

        assert response.status_code == status.HTTP_404_NOT_FOUND
