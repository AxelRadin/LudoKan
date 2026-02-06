import logging
import time

from notifications.models import Notification
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.serializers import NotificationSerializer

logger = logging.getLogger(__name__)


class NotificationListView(ListAPIView):
    """
    Liste paginée des notifications de l'utilisateur connecté.

    GET /api/notifications
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        return Notification.objects.filter(recipient=user).select_related("recipient").order_by("-timestamp")

    def list(self, request, *args, **kwargs):
        """
        Surcharge pour mesurer le temps de réponse du endpoint et le logguer.
        """
        start = time.monotonic()
        response = super().list(request, *args, **kwargs)
        duration_ms = (time.monotonic() - start) * 1000
        logger.info(
            "GET /api/notifications completed in %.2f ms (user_id=%s, count=%s)",
            duration_ms,
            request.user.id if request.user.is_authenticated else None,
            len(response.data.get("results", [])) if isinstance(response.data, dict) else "n/a",
        )
        return response


class NotificationDetailView(RetrieveUpdateAPIView):
    """
    Permet de marquer une notification comme lue / non-lue.

    PATCH /api/notifications/{id}
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        """
        Restreint l'accès aux notifications appartenant à l'utilisateur connecté.
        """
        user = self.request.user
        return Notification.objects.filter(recipient=user)


class NotificationMarkAllReadView(APIView):
    """
    Marquer toutes les notifications non lues de l'utilisateur comme lues.

    PATCH /api/notifications/mark-all-read/
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        user = request.user

        qs = Notification.objects.filter(recipient=user, unread=True)

        start = time.monotonic()
        updated_count = qs.update(unread=False)
        duration_ms = (time.monotonic() - start) * 1000

        logger.info(
            "PATCH /api/notifications/mark-all-read updated %s notifications in %.2f ms (user_id=%s)",
            updated_count,
            duration_ms,
            user.id,
        )

        return Response(
            {
                "updated": updated_count,
            },
            status=status.HTTP_200_OK,
        )
