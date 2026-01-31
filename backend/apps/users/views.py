from datetime import timedelta

from dj_rest_auth.views import UserDetailsView as DjUserDetailsView
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.chat.models import Message
from apps.game_tickets.models import GameTicket
from apps.games.models import Game, Rating
from apps.reviews.models import ContentReport, Review
from apps.reviews.serializers import ContentReportAdminSerializer
from apps.users.models import AdminAction, UserRole, UserSuspension
from apps.users.permissions import IsAdminWithPermission, IsNotSuspended
from apps.users.serializers import AdminActionSerializer, AdminUserListSerializer, UserSuspendSerializer, UserSuspensionSerializer
from apps.users.utils import log_admin_action

User = get_user_model()


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
        "tickets": 32,
        "reviews": 900
      }
    }
    """

    permission_classes = [IsAdminWithPermission]
    required_permission = "dashboard.view"

    def get(self, request):
        now = timezone.now()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # Cache configurable pour éviter d'impacter les tests (désactivé par défaut).
        cache_timeout = getattr(settings, "ADMIN_STATS_CACHE_TIMEOUT", 0)
        use_cache = cache_timeout > 0

        cache_key = "admin:stats"
        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data, status=status.HTTP_200_OK)

        # Totaux globaux pour le dashboard + engagement utilisateurs en une requête
        user_agg = User.objects.aggregate(
            total=Count("id"),
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
        tickets_total = GameTicket.objects.count()

        # Engagement contenu (ratings, messages) via agrégations conditionnelles
        ratings_agg = Rating.objects.aggregate(last_30d=Count("id", filter=Q(date_created__gte=month_ago)))
        messages_agg = Message.objects.aggregate(last_30d=Count("id", filter=Q(created_at__gte=month_ago)))

        totals = {
            "users": user_agg["total"],
            "games": games_total,
            "tickets": tickets_total,
            "reviews": review_agg["total"],
        }

        engagement = {
            "active_day": user_agg["active_day"],
            "active_week": user_agg["active_week"],
            "active_month": user_agg["active_month"],
            "reviews_last_30d": review_agg["last_30d"],
            "ratings_last_30d": ratings_agg["last_30d"],
            "messages_last_30d": messages_agg["last_30d"],
        }

        # Activité récente (20 dernières actions admin, triées par timestamp décroissant)
        recent_actions = AdminAction.objects.select_related("admin_user").order_by("-timestamp")[:20]

        recent_activity = []
        for action in recent_actions:
            actor = action.admin_user.pseudo if action.admin_user else None
            target = f"{action.target_type}#{action.target_id}" if action.target_type and action.target_id is not None else None

            action_name = action.action_type.replace(".", "_") if action.action_type else None

            recent_activity.append(
                {
                    "action": action_name,
                    "actor": actor,
                    "target": target,
                    "time": action.timestamp,
                }
            )

        payload = {
            "totals": totals,
            "engagement": engagement,
            "recent_activity": recent_activity,
        }

        if use_cache:
            cache.set(cache_key, payload, timeout=cache_timeout)

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

        email = self.request.query_params.get("email")
        pseudo = self.request.query_params.get("pseudo")
        is_active = self.request.query_params.get("is_active")
        is_staff = self.request.query_params.get("is_staff")
        role = self.request.query_params.get("role")
        created_before = self.request.query_params.get("created_before")
        created_after = self.request.query_params.get("created_after")

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
