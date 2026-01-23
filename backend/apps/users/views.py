from dj_rest_auth.views import UserDetailsView as DjUserDetailsView
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import AdminAction, UserRole, UserSuspension
from apps.users.permissions import HasPermission, IsNotSuspended
from apps.users.serializers import UserSuspendSerializer

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

    permission_classes = [HasPermission]
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
