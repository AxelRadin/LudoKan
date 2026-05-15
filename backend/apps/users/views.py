from datetime import date, datetime
from datetime import time as dt_time
from datetime import timedelta

from dj_rest_auth.views import UserDetailsView as DjUserDetailsView
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import Message
from apps.core.reports_export import MSG_EXPORT_FORBIDDEN, PERMISSION_REPORTS_EXPORT, build_users_csv, build_users_pdf
from apps.games.models import Game, Genre, Rating
from apps.reviews.models import ContentReport, Review
from apps.reviews.serializers import ContentReportAdminSerializer
from apps.support.models import SupportTicket
from apps.users.models import AdminAction, UserRole, UserSuspension
from apps.users.permissions import IsAdminWithPermission, IsNotSuspended, has_permission
from apps.users.serializers import AdminActionSerializer, AdminUserListSerializer, UserSuspendSerializer, UserSuspensionSerializer
from apps.users.utils import log_admin_action

User = get_user_model()


class AdminActionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class SuspensionAwareUserDetailsView(DjUserDetailsView):
    """
    Variante de UserDetailsView qui bloque les utilisateurs suspendus.
    """

    permission_classes = [IsAuthenticated, IsNotSuspended]


class AdminSuspendUserView(APIView):
    """
    Endpoint admin pour suspendre un utilisateur.

    POST /api/admin/users/{id}/suspend
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "suspend_user"

    def post(self, request, pk: int):
        actor: User = request.user
        target: User = get_object_or_404(User, pk=pk)

        serializer = UserSuspendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Empêcher l'auto-suspension
        if actor.pk == target.pk:
            return Response(
                {"detail": "Vous ne pouvez pas vous suspendre vous-même."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Empêcher la suspension d'un superadmin
        target_roles = set(UserRole.objects.filter(user=target).values_list("role", flat=True))
        if target.is_superuser or UserRole.Role.SUPERADMIN in target_roles:
            return Response(
                {"detail": "Vous ne pouvez pas suspendre un superadmin."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Créer la suspension
        suspension = UserSuspension.objects.create(
            user=target,
            suspended_by=actor,
            reason=serializer.validated_data["reason"],
            end_date=serializer.validated_data.get("end_date"),
        )
        target.is_active = False
        target.save(update_fields=["is_active"])

        # Logguer l'action admin
        log_admin_action(
            admin_user=actor,
            action_type="user.suspend",
            target_type="user",
            target_id=target.pk,
            description=serializer.validated_data["reason"],
        )

        return Response(
            {
                "id": suspension.id,
                "user_id": target.pk,
                "reason": suspension.reason,
                "start_date": suspension.start_date,
                "end_date": suspension.end_date,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminReactivateUserView(APIView):
    """
    Endpoint admin pour réactiver un utilisateur suspendu.

    POST /api/admin/users/{id}/reactivate/
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "suspend_user"

    def post(self, request, pk: int):
        actor: User = request.user
        target: User = get_object_or_404(User, pk=pk)

        active_suspensions = UserSuspension.objects.filter(user=target, is_active=True)
        if not active_suspensions.exists():
            return Response(
                {"detail": "Cet utilisateur n'est pas suspendu."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        active_suspensions.update(is_active=False)
        target.is_active = True
        target.save(update_fields=["is_active"])

        log_admin_action(
            admin_user=actor,
            action_type="user.reactivate",
            target_type="user",
            target_id=target.pk,
            description=f"Réactivation du compte de {target.pseudo or target.email}",
        )

        return Response({"detail": "Compte réactivé avec succès."}, status=status.HTTP_200_OK)


class AdminUserSuspensionListView(APIView):
    """
    Endpoint admin pour lister les suspensions d'un utilisateur.

    GET /api/admin/users/{id}/suspensions
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "user.suspend"

    def get(self, request, pk: int):
        user = get_object_or_404(User, pk=pk)
        suspensions = UserSuspension.objects.filter(user=user).order_by("-start_date")
        serializer = UserSuspensionSerializer(suspensions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminStatsView(APIView):
    """
    Endpoint admin pour récupérer les statistiques globales du Dashboard.

    GET /api/admin/stats/

    Réponse attendue :
    {
      "totals": {
        "users": 1234,
        "games": 542,
        "support_tickets": 12,
        "support_tickets_open": 3,
        "reviews": 900
      }
    }
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "dashboard.view"

    def get(self, request):
        now = timezone.now()

        # Cache configurable pour éviter d'impacter les tests (désactivé par défaut).
        cache_timeout = getattr(settings, "ADMIN_STATS_CACHE_TIMEOUT", 0)
        use_cache = cache_timeout > 0

        cache_key = "admin:stats"
        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data, status=status.HTTP_200_OK)

        totals, engagement = self._get_stats_aggregates(now)
        recent_activity = self._get_recent_activity()
        charts = self._get_charts_data(now)

        payload = {
            "totals": totals,
            "engagement": engagement,
            "recent_activity": recent_activity,
            "charts": charts,
        }

        if use_cache:
            cache.set(cache_key, payload, timeout=cache_timeout)

        return Response(payload, status=status.HTTP_200_OK)

    def _get_stats_aggregates(self, now):
        """Calcule les agrégations de statistiques pour le dashboard."""
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Totaux globaux pour le dashboard + engagement utilisateurs en une requête
        user_agg = User.objects.aggregate(
            total=Count("id"),
            new_last_7_days=Count("id", filter=Q(created_at__gte=week_ago)),
            active_day=Count("id", filter=Q(last_login__gte=day_ago)),
            active_week=Count("id", filter=Q(last_login__gte=week_ago)),
            active_month=Count("id", filter=Q(last_login__gte=month_ago)),
        )

        # Totaux + reviews récentes en une requête
        review_agg = Review.objects.aggregate(
            total=Count("id"),
            last_30d=Count("id", filter=Q(date_created__gte=month_ago)),
        )

        # Totaux simples sur autres entités
        games_total = Game.objects.count()
        support_agg = SupportTicket.objects.aggregate(
            total=Count("id"),
            open_count=Count(
                "id",
                filter=Q(status__in=[SupportTicket.Status.OPEN, SupportTicket.Status.IN_PROGRESS]),
            ),
        )

        reports_unresolved = ContentReport.objects.filter(handled=False).count()

        # Engagement contenu (ratings, messages) via agrégations conditionnelles
        ratings_agg = Rating.objects.aggregate(last_30d=Count("id", filter=Q(date_created__gte=month_ago)))
        messages_agg = Message.objects.aggregate(last_30d=Count("id", filter=Q(created_at__gte=month_ago)))

        totals = {
            "users": user_agg["total"],
            "users_new_last_7_days": user_agg["new_last_7_days"],
            "games": games_total,
            "support_tickets": support_agg["total"],
            "support_tickets_open": support_agg["open_count"],
            "reviews": review_agg["total"],
            "reports_unresolved": reports_unresolved,
        }

        engagement = {
            "active_day": user_agg["active_day"],
            "active_week": user_agg["active_week"],
            "active_month": user_agg["active_month"],
            "reviews_last_30d": review_agg["last_30d"],
            "ratings_last_30d": ratings_agg["last_30d"],
            "messages_last_30d": messages_agg["last_30d"],
        }

        return totals, engagement

    def _get_charts_data(self, now):
        """Données agrégées pour graphiques dashboard (14 jours, top jeux, genres)."""

        def _as_date(val):
            if val is None:
                return None
            if isinstance(val, datetime):
                return timezone.localtime(val).date() if timezone.is_aware(val) else val.date()
            if isinstance(val, date):
                return val
            return val

        if timezone.is_aware(now):
            local_now = timezone.localtime(now)
            tz = timezone.get_current_timezone()
            start_date = (local_now - timedelta(days=13)).date()
            day_start = timezone.make_aware(datetime.combine(start_date, dt_time.min), tz)
        else:
            start_date = (now - timedelta(days=13)).date()
            day_start = datetime.combine(start_date, dt_time.min)

        new_rows = User.objects.filter(created_at__gte=day_start).annotate(day=TruncDate("created_at")).values("day").annotate(count=Count("id"))
        new_by_day = {_as_date(row["day"]): row["count"] for row in new_rows}

        active_rows = (
            User.objects.filter(last_login__gte=day_start, last_login__isnull=False)
            .annotate(day=TruncDate("last_login"))
            .values("day")
            .annotate(count=Count("id"))
        )
        active_by_day = {_as_date(row["day"]): row["count"] for row in active_rows}

        users_daily = []
        for i in range(14):
            d = start_date + timedelta(days=i)
            users_daily.append(
                {
                    "date": d.isoformat(),
                    "new_users": int(new_by_day.get(d, 0)),
                    "active_logins": int(active_by_day.get(d, 0)),
                }
            )

        top_games_qs = Game.objects.annotate(review_count=Count("reviews")).filter(review_count__gt=0).order_by("-review_count")[:10]
        games_top = [
            {
                "id": g.id,
                "name": (g.name[:28] + "…") if len(g.name) > 28 else g.name,
                "reviews": g.review_count,
            }
            for g in top_games_qs
        ]

        top_genres_qs = Genre.objects.annotate(game_count=Count("games")).filter(game_count__gt=0).order_by("-game_count")[:10]
        genres_share = [{"name": g.name, "count": g.game_count} for g in top_genres_qs]

        return {
            "users_daily": users_daily,
            "games_top": games_top,
            "genres_share": genres_share,
        }

    def _get_recent_activity(self):
        """Récupère et formate les 20 dernières actions d'administration."""
        recent_actions = AdminAction.objects.select_related("admin_user").order_by("-timestamp")[:20]

        target_user_ids = [a.target_id for a in recent_actions if a.target_type == "user" and a.target_id is not None]
        target_users = {u.pk: u.pseudo or u.email for u in User.objects.filter(pk__in=target_user_ids)}

        recent_activity = []
        for action in recent_actions:
            actor = action.admin_user.pseudo if action.admin_user else None
            target = None

            if action.target_type == "user" and action.target_id in target_users:
                target = target_users[action.target_id]
            elif action.target_type and action.target_id is not None:
                target = f"{action.target_type}#{action.target_id}"

            action_name = action.action_type.replace(".", "_") if action.action_type else None

            recent_activity.append(
                {
                    "id": action.pk,
                    "action": action_name,
                    "actor": actor,
                    "target": target,
                    "time": action.timestamp,
                }
            )

        return recent_activity


def _build_users_report_payload():
    """Construit le payload du rapport utilisateurs (réduit complexité cognitive de get())."""
    now = timezone.now()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    user_agg = User.objects.aggregate(
        total=Count("id"),
        new_day=Count("id", filter=Q(created_at__gte=day_ago)),
        new_week=Count("id", filter=Q(created_at__gte=week_ago)),
        new_month=Count("id", filter=Q(created_at__gte=month_ago)),
        active_day=Count("id", filter=Q(last_login__gte=day_ago)),
        active_week=Count("id", filter=Q(last_login__gte=week_ago)),
        active_month=Count("id", filter=Q(last_login__gte=month_ago)),
    )
    suspended_count = (
        UserSuspension.objects.filter(is_active=True).filter(Q(end_date__isnull=True) | Q(end_date__gt=now)).values("user").distinct().count()
    )
    return {
        "total": user_agg["total"],
        "new": {
            "day": user_agg["new_day"],
            "week": user_agg["new_week"],
            "month": user_agg["new_month"],
        },
        "active": {
            "day": user_agg["active_day"],
            "week": user_agg["active_week"],
            "month": user_agg["active_month"],
        },
        "suspended": suspended_count,
    }


def _handle_users_export(request, data):
    """Gère l'export CSV/PDF du rapport utilisateurs. Retourne une Response ou None si pas d'export."""
    export = request.query_params.get("export")
    if export == "csv":
        if not has_permission(request.user, PERMISSION_REPORTS_EXPORT):
            return Response({"detail": MSG_EXPORT_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
        content = build_users_csv(data)
        resp = HttpResponse(content.encode("utf-8"), content_type="text/csv; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="report_users.csv"'
        return resp
    if export == "pdf":
        if not has_permission(request.user, PERMISSION_REPORTS_EXPORT):
            return Response({"detail": MSG_EXPORT_FORBIDDEN}, status=status.HTTP_403_FORBIDDEN)
        content = build_users_pdf(data)
        resp = HttpResponse(content, content_type="application/pdf")
        resp["Content-Disposition"] = 'attachment; filename="report_users.pdf"'
        return resp
    return None


class AdminReportsUsersView(APIView):
    """
    Métriques détaillées utilisateurs pour les rapports planifiés

    GET /api/admin/reports/users/

    Réponse :
    {
      "total": 12340,
      "new": { "day": 20, "week": 130, "month": 530 },
      "active": { "day": 240, "week": 1500, "month": 6400 },
      "suspended": 12
    }
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "dashboard.view"

    def get(self, request):
        cache_timeout = getattr(settings, "ADMIN_REPORTS_USERS_CACHE_TIMEOUT", 60)
        use_cache = cache_timeout > 0
        cache_key = "admin:reports:users"

        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                export_response = _handle_users_export(request, cached_data)
                if export_response is not None:
                    return export_response
                return Response(cached_data, status=status.HTTP_200_OK)

        payload = _build_users_report_payload()
        if use_cache:
            cache.set(cache_key, payload, timeout=cache_timeout)

        export_response = _handle_users_export(request, payload)
        if export_response is not None:
            return export_response
        return Response(payload, status=status.HTTP_200_OK)


class MyReportsView(APIView):
    """
    Endpoint pour récupérer les signalements faits par l'utilisateur courant.

    GET /api/me/reports
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = ContentReport.objects.filter(reporter=request.user).order_by("-created_at")
        serializer = ContentReportAdminSerializer(reports, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminUserListView(ListAPIView):
    """
    Endpoint admin pour lister les utilisateurs.

    GET /api/admin/users
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "user.view"
    serializer_class = AdminUserListSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by("-created_at")

        search = self.request.query_params.get("search")
        email = self.request.query_params.get("email")
        pseudo = self.request.query_params.get("pseudo")
        is_active = self.request.query_params.get("is_active")
        is_staff = self.request.query_params.get("is_staff")
        role = self.request.query_params.get("role")
        panel_staff_only = self.request.query_params.get("panel_staff_only")
        created_before = self.request.query_params.get("created_before")
        created_after = self.request.query_params.get("created_after")

        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(pseudo__icontains=search))
        if email:
            qs = qs.filter(email__icontains=email)
        if pseudo:
            qs = qs.filter(pseudo__icontains=pseudo)
        if is_active is not None:
            if is_active.lower() in {"true", "1"}:
                qs = qs.filter(is_active=True)
            elif is_active.lower() in {"false", "0"}:
                qs = qs.filter(is_active=False)
        if is_staff is not None:
            if is_staff.lower() in {"true", "1"}:
                qs = qs.filter(is_staff=True)
            elif is_staff.lower() in {"false", "0"}:
                qs = qs.filter(is_staff=False)
        if role:
            qs = qs.filter(roles__role=role)
        if panel_staff_only and str(panel_staff_only).lower() in {"true", "1", "yes"}:
            qs = qs.filter(
                roles__role__in=[
                    UserRole.Role.MODERATOR,
                    UserRole.Role.ADMIN,
                    UserRole.Role.SUPERADMIN,
                ]
            ).distinct()
        if created_before:
            qs = qs.filter(created_at__lte=created_before)
        if created_after:
            qs = qs.filter(created_at__gte=created_after)

        return qs.select_related().prefetch_related("roles", "suspensions")


class AdminActionListView(ListAPIView):
    """
    Endpoint admin pour lister les actions d'administration.

    GET /api/admin/actions
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "admin_action_read"
    serializer_class = AdminActionSerializer
    pagination_class = AdminActionPagination

    def get_queryset(self):
        qs = AdminAction.objects.select_related("admin_user").all().order_by("-timestamp")

        action_type = self.request.query_params.get("action_type")
        target_type = self.request.query_params.get("target_type")
        target_id = self.request.query_params.get("target_id")
        admin_user_id = self.request.query_params.get("admin_user_id")
        created_before = self.request.query_params.get("before")
        created_after = self.request.query_params.get("after")

        if action_type:
            qs = qs.filter(action_type=action_type)
        if target_type:
            qs = qs.filter(target_type=target_type)
        if target_id:
            qs = qs.filter(target_id=target_id)
        if admin_user_id:
            qs = qs.filter(admin_user_id=admin_user_id)
        if created_before:
            qs = qs.filter(timestamp__lte=created_before)
        if created_after:
            qs = qs.filter(timestamp__gte=created_after)

        return qs


def password_reset_confirm_redirect(_request, uidb64, token):
    """Redirige le lien de l'email de reset vers la page frontend correspondante."""
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    return HttpResponseRedirect(f"{frontend_url}/reset-password/{uidb64}/{token}")


def email_confirm_redirect(_request, key):
    """Redirige le lien de confirmation d'email vers la page frontend correspondante."""
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    return HttpResponseRedirect(f"{frontend_url}/verify-email/{key}")
