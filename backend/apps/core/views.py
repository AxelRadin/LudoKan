from notifications.models import Notification
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated

from apps.core.serializers import NotificationSerializer


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
