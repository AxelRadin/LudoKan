import logging
import time
from datetime import timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from django.utils import timezone
from notifications.models import Notification
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import ActivityLog
from apps.core.reports_export import MSG_EXPORT_FORBIDDEN, PERMISSION_REPORTS_EXPORT, build_activity_csv, build_activity_pdf
from apps.core.serializers import NotificationSerializer
from apps.users.models import AdminAction
from apps.users.permissions import IsAdminWithPermission, has_permission

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

    @staticmethod
    def _since_for_period(period):
        now = timezone.now()
        if period == "24h":
            return now - timedelta(hours=24)
        if period == "7d":
            return now - timedelta(days=7)
        return now - timedelta(days=30)

    @staticmethod
    def _activity_item(user_display, action, at_iso, target=None):
        item = {"user": user_display, "action": action, "at": at_iso}
        if target:
            item["target"] = target
        return item

    def _activity_from_logs(self, since, user_id, action_filter):
        qs = ActivityLog.objects.filter(created_at__gte=since).select_related("user")
        if user_id:
            try:
                qs = qs.filter(user_id=int(user_id))
            except ValueError:
                pass
        if action_filter:
            qs = qs.filter(action=action_filter)
        qs = qs.order_by("-created_at")[: self.MAX_ITEMS]
        return [
            self._activity_item(
                log.user.pseudo if log.user else "",
                log.action,
                log.created_at.isoformat(),
                f"{log.target_type}#{log.target_id}" if log.target_type and log.target_id is not None else None,
            )
            for log in qs
        ]

    def _activity_from_admin_actions(self, since, user_id, action_filter):
        qs = AdminAction.objects.filter(timestamp__gte=since).select_related("admin_user")
        if user_id:
            try:
                qs = qs.filter(admin_user_id=int(user_id))
            except ValueError:
                pass
        if action_filter:
            qs = qs.filter(action_type=action_filter)
        qs = qs.order_by("-timestamp")[: self.MAX_ITEMS]
        return [
            self._activity_item(
                admin_act.admin_user.pseudo if admin_act.admin_user else "",
                admin_act.action_type,
                admin_act.timestamp.isoformat(),
                f"{admin_act.target_type}#{admin_act.target_id}" if admin_act.target_type and admin_act.target_id is not None else None,
            )
            for admin_act in qs
        ]

    def _handle_export_response(self, request, payload, export):
        if export not in ("csv", "pdf"):
            return None
        if not has_permission(request.user, PERMISSION_REPORTS_EXPORT):
            return Response(
                {"detail": MSG_EXPORT_FORBIDDEN},
                status=status.HTTP_403_FORBIDDEN,
            )
        if export == "csv":
            content = build_activity_csv(payload)
            resp = HttpResponse(content.encode("utf-8"), content_type="text/csv; charset=utf-8")
        else:
            content = build_activity_pdf(payload)
            resp = HttpResponse(content, content_type="application/pdf")
        resp["Content-Disposition"] = 'attachment; filename="report_activity.%s"' % ("csv" if export == "csv" else "pdf")
        return resp

    def get(self, request):
        period = request.query_params.get("period", "30d")
        user_id = request.query_params.get("user")
        action_filter = request.query_params.get("action")
        since = self._since_for_period(period)

        cache_timeout = getattr(settings, "ADMIN_REPORTS_ACTIVITY_CACHE_TIMEOUT", 0)
        use_cache = cache_timeout > 0
        cache_key = f"admin:reports:activity:{period}:{user_id or ''}:{action_filter or ''}"
        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data, status=status.HTTP_200_OK)

        activity = self._activity_from_logs(since, user_id, action_filter) + self._activity_from_admin_actions(since, user_id, action_filter)
        activity.sort(key=lambda x: x["at"], reverse=True)
        activity = activity[: self.MAX_ITEMS]
        payload = {"activity": activity}

        if use_cache:
            cache.set(cache_key, payload, timeout=cache_timeout)

        export = request.query_params.get("export")
        export_resp = self._handle_export_response(request, payload, export)
        if export_resp is not None:
            return export_resp
        return Response(payload, status=status.HTTP_200_OK)
