import logging
import time
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from notifications.models import Notification
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import ActivityLog
from apps.core.serializers import NotificationSerializer
from apps.users.models import AdminAction
from apps.users.permissions import IsAdminWithPermission

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


class AdminReportsActivityView(APIView):
    """
    Journal d'activité pour les rapports planifiés (BACK-021D).
    Fusionne ActivityLog et AdminAction avec filtres optionnels.

    GET /api/admin/reports/activity/
    Query params: user (user_id), action (type d'action), period (24h | 7d | 30d, défaut 30d)

    Réponse :
    {
      "activity": [
        { "user": "alice", "action": "login", "at": "2025-02-20T10:00:00Z" },
        { "user": "bob", "action": "review_posted", "target": "game#53", "at": "..." }
      ]
    }
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "dashboard.view"

    MAX_ITEMS = 500

    def get(self, request):
        period = request.query_params.get("period", "30d")
        user_id = request.query_params.get("user")
        action_filter = request.query_params.get("action")

        now = timezone.now()
        if period == "24h":
            since = now - timedelta(hours=24)
        elif period == "7d":
            since = now - timedelta(days=7)
        else:
            since = now - timedelta(days=30)

        cache_timeout = getattr(settings, "ADMIN_REPORTS_ACTIVITY_CACHE_TIMEOUT", 0)
        use_cache = cache_timeout > 0
        cache_key = f"admin:reports:activity:{period}:{user_id or ''}:{action_filter or ''}"
        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data, status=status.HTTP_200_OK)

        activity = []

        qs_logs = ActivityLog.objects.filter(created_at__gte=since).select_related("user")
        if user_id:
            try:
                qs_logs = qs_logs.filter(user_id=int(user_id))
            except ValueError:
                pass
        if action_filter:
            qs_logs = qs_logs.filter(action=action_filter)
        qs_logs = qs_logs.order_by("-created_at")[: self.MAX_ITEMS]

        for log in qs_logs:
            target = None
            if log.target_type and log.target_id is not None:
                target = f"{log.target_type}#{log.target_id}"
            activity.append(
                {
                    "user": log.user.pseudo if log.user else "",
                    "action": log.action,
                    "at": log.created_at.isoformat(),
                    **({"target": target} if target else {}),
                }
            )

        # AdminAction (actions admin) — filtres avant le slice
        qs_admin = AdminAction.objects.filter(timestamp__gte=since).select_related("admin_user")
        if user_id:
            try:
                qs_admin = qs_admin.filter(admin_user_id=int(user_id))
            except ValueError:
                pass
        if action_filter:
            qs_admin = qs_admin.filter(action_type=action_filter)
        qs_admin = qs_admin.order_by("-timestamp")[: self.MAX_ITEMS]

        for admin_act in qs_admin:
            target = None
            if admin_act.target_type and admin_act.target_id is not None:
                target = f"{admin_act.target_type}#{admin_act.target_id}"
            activity.append(
                {
                    "user": admin_act.admin_user.pseudo if admin_act.admin_user else "",
                    "action": admin_act.action_type,
                    "at": admin_act.timestamp.isoformat(),
                    **({"target": target} if target else {}),
                }
            )

        # Tri global par date décroissante
        activity.sort(key=lambda x: x["at"], reverse=True)
        activity = activity[: self.MAX_ITEMS]

        payload = {"activity": activity}

        if use_cache:
            cache.set(cache_key, payload, timeout=cache_timeout)

        return Response(payload, status=status.HTTP_200_OK)
