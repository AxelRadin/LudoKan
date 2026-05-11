from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.social.models import FriendRequest
from apps.social.serializers import FriendMiniSerializer, FriendRequestCreateSerializer, FriendRequestSerializer, FriendshipFriendSerializer
from apps.social.services import accept_friend_request, cancel_friend_request, decline_friend_request, remove_friendship, send_friend_request
from apps.social.utils import friends_queryset_for

User = get_user_model()


class FriendRequestViewSet(ModelViewSet):
    """
    POST create (body: to_user_id | to_pseudo)
    GET list: outgoing by default; ?direction=incoming
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return FriendRequestCreateSerializer
        return FriendRequestSerializer

    def get_queryset(self):
        user = self.request.user
        direction = self.request.query_params.get("direction", "outgoing")
        if direction == "incoming":
            return FriendRequest.objects.filter(to_user=user, status=FriendRequest.Status.PENDING).select_related("from_user", "to_user")
        return FriendRequest.objects.filter(from_user=user, status=FriendRequest.Status.PENDING).select_related("from_user", "to_user")

    def create(self, request, *args, **kwargs):
        ser = FriendRequestCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        to_user = ser.resolve_to_user()
        if not to_user:
            raise ValidationError({"to_user": "Utilisateur introuvable."})
        if to_user.pk == request.user.pk:
            raise ValidationError({"to_user": "Impossible de s’ajouter soi-même."})
        try:
            result = send_friend_request(request.user, to_user)
        except ValueError as e:
            raise ValidationError(str(e)) from e
        if result.auto_accepted:
            return Response(
                {"detail": "Vous êtes maintenant amis.", "auto_accepted": True},
                status=status.HTTP_201_CREATED,
            )
        out = FriendRequestSerializer(result.request, context=self.get_serializer_context())
        return Response(out.data, status=status.HTTP_201_CREATED)


class FriendRequestAcceptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        fr = get_object_or_404(FriendRequest, pk=pk)
        try:
            accept_friend_request(fr, request.user)
        except PermissionError as e:
            raise PermissionDenied(str(e)) from e
        except ValueError as e:
            raise ValidationError(str(e)) from e
        return Response({"detail": "Demande acceptée."}, status=status.HTTP_200_OK)


class FriendRequestDeclineView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        fr = get_object_or_404(FriendRequest, pk=pk)
        try:
            decline_friend_request(fr, request.user)
        except PermissionError as e:
            raise PermissionDenied(str(e)) from e
        except ValueError as e:
            raise ValidationError(str(e)) from e
        return Response({"detail": "Demande refusée."}, status=status.HTTP_200_OK)


class FriendRequestCancelView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        fr = get_object_or_404(FriendRequest, pk=pk)
        try:
            cancel_friend_request(fr, request.user)
        except PermissionError as e:
            raise PermissionDenied(str(e)) from e
        except ValueError as e:
            raise ValidationError(str(e)) from e
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendsListView(ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FriendshipFriendSerializer

    def get_queryset(self):
        return friends_queryset_for(self.request.user).order_by("pseudo")


class UserSearchView(ListAPIView):
    """
    Recherche d'utilisateurs par pseudo ou nom (authentifié uniquement).
    GET /api/social/users/search/?q=   (minimum 2 caractères, max 25 résultats)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = FriendMiniSerializer
    pagination_class = None

    def get_queryset(self):
        q = (self.request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return User.objects.none()
        return (
            User.objects.filter(is_active=True)
            .exclude(pk=self.request.user.pk)
            .filter(Q(pseudo__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q))
            .order_by("pseudo")[:25]
        )


class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        other = get_object_or_404(User, pk=user_id)
        try:
            remove_friendship(request.user, other)
        except ValueError as e:
            raise ValidationError(str(e)) from e
        return Response(status=status.HTTP_204_NO_CONTENT)
