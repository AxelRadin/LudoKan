from datetime import timedelta

from dj_rest_auth.views import UserDetailsView as DjUserDetailsView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
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
from apps.users.serializers import UserSuspendSerializer, UserSuspensionSerializer

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
        AdminAction.objects.create(
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

        # Totaux globaux pour le dashboard
        totals = {
            "users": User.objects.count(),
            "games": Game.objects.count(),
            "tickets": GameTicket.objects.count(),
            "reviews": Review.objects.count(),
        }

        # Engagement utilisateurs (basé sur last_login)
        engagement = {
            "active_day": User.objects.filter(last_login__gte=day_ago).count(),
            "active_week": User.objects.filter(last_login__gte=week_ago).count(),
            "active_month": User.objects.filter(last_login__gte=month_ago).count(),
            # Engagement contenu (optionnel)
            "reviews_last_30d": Review.objects.filter(date_created__gte=month_ago).count(),
            "ratings_last_30d": Rating.objects.filter(date_created__gte=month_ago).count(),
            "messages_last_30d": Message.objects.filter(created_at__gte=month_ago).count(),
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
