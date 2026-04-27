from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.games.models import Game
from apps.library.models import UserGame, UserLibrary, UserLibraryEntry
from apps.library.serializers import PublicUserLibrarySerializer, UserGameSerializer, UserLibrarySerializer
from apps.library.tasks import sync_steam_library_task


@extend_schema_view(
    list=extend_schema(
        summary="Lister les jeux de la bibliothèque de l'utilisateur",
        description="Retourne la liste complète des jeux appartenant à l'utilisateur authentifié.",
        responses=UserGameSerializer(many=True),
    ),
    destroy=extend_schema(
        summary="Supprimer un jeu de la bibliothèque de l'utilisateur",
        description=(
            "Supprime un jeu de la collection personnelle de l'utilisateur. "
            + "Le `game_id` doit correspondre à un jeu présent dans sa bibliothèque."
        ),
        responses={
            204: None,
            404: {"description": "Le jeu n'existe pas dans la bibliothèque de l'utilisateur."},
        },
    ),
)
class UserGameViewSet(viewsets.ModelViewSet):
    serializer_class = UserGameSerializer
    permission_classes = [IsAuthenticated]

    lookup_field = "game_id"

    def get_queryset(self):
        user = self.request.user

        qs = (
            UserGame.objects.filter(user=user)
            .select_related("game", "game__publisher")
            .prefetch_related(
                "game__genres",
                "game__platforms",
                Prefetch(
                    "library_entries",
                    queryset=UserLibraryEntry.objects.only("id", "library_id", "user_game_id"),
                ),
            )
            .order_by("-date_added")
        )
        collection_id = self.request.query_params.get("collection")
        if collection_id:
            try:
                lid = int(collection_id)
            except (TypeError, ValueError):
                return qs
            if not UserLibrary.objects.filter(pk=lid, user=user).exists():
                return qs.none()
            return qs.filter(library_entries__library_id=lid).distinct()
        return qs

    def partial_update(self, request, *args, **kwargs):
        """
        PATCH /api/me/games/<game_id>/

        Met à jour le UserGame existant, ou le crée avec le statut ENVIE_DE_JOUER
        s'il n'existe pas encore (typiquement lors d'un premier coup de cœur).
        Le statut n'est jamais écrasé implicitement si un UserGame existe déjà.
        """
        game_id = kwargs.get("game_id")
        game = get_object_or_404(Game, pk=game_id)

        user_game, created = UserGame.objects.get_or_create(
            user=request.user,
            game=game,
            defaults={"status": UserGame.GameStatus.ENVIE_DE_JOUER},
        )
        serializer = self.get_serializer(user_game, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(serializer.data, status=status_code)

    def destroy(self, request, *args, **kwargs):
        game_id = kwargs.get("game_id")
        user_game = get_object_or_404(UserGame, user=request.user, game_id=game_id)
        user_game.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SteamSyncThrottle(UserRateThrottle):
    rate = "1/min"


class SteamSyncView(APIView):
    """
    Déclenche la synchronisation de la bibliothèque Steam en asynchrone via Celery.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [SteamSyncThrottle]

    @extend_schema(
        summary="Synchroniser la bibliothèque Steam",
        description="Lance une tâche asynchrone pour mettre à jour les jeux depuis Steam.\nLimité à 1 appel par minute par utilisateur.",
        responses={
            202: {"description": "Synchronisation lancée en arrière-plan."},
            429: {"description": "Trop de requêtes. Veuillez patienter."},
        },
    )
    def post(self, request, *args, **kwargs):
        # We start the Celery task safely
        sync_steam_library_task.delay(request.user.id)

        return Response({"detail": "La synchronisation a été ajoutée à la file d'attente."}, status=status.HTTP_202_ACCEPTED)


class UserLibraryViewSet(viewsets.ModelViewSet):
    serializer_class = UserLibrarySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = UserLibrary.objects.filter(user=self.request.user)
        if self.action == "list":
            qs = qs.exclude(system_key=UserLibrary.SystemKey.MA_LUDOTHEQUE)
        return qs.annotate(games_count=Count("entries", distinct=True)).order_by("sort_order", "id")

    def perform_destroy(self, instance):
        if instance.system_key:
            raise PermissionDenied("Impossible de supprimer une collection système.")
        instance.delete()

    @extend_schema(
        summary="Ajouter un jeu à la collection",
        request={"application/json": {"type": "object", "properties": {"user_game_id": {"type": "integer"}}}},
    )
    @action(detail=True, methods=["post"], url_path="entries")
    def add_entry(self, request, pk=None):
        library = self.get_object()
        user_game_id = request.data.get("user_game_id")
        if user_game_id is None:
            return Response({"user_game_id": "Ce champ est obligatoire."}, status=status.HTTP_400_BAD_REQUEST)
        user_game = get_object_or_404(UserGame, pk=user_game_id, user=request.user)
        _entry, created = UserLibraryEntry.objects.get_or_create(library=library, user_game=user_game)
        return Response(
            {"detail": "Jeu ajouté à la collection."},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @extend_schema(summary="Retirer un jeu de la collection")
    @action(detail=True, methods=["delete"], url_path=r"entries/(?P<user_game_id>[^/.]+)")
    def remove_entry(self, request, user_game_id=None, pk=None):
        library = self.get_object()
        if library.system_key == UserLibrary.SystemKey.MA_LUDOTHEQUE:
            raise PermissionDenied("Impossible de retirer un jeu de « Ma ludothèque ».")
        try:
            ug_pk = int(user_game_id)
        except (TypeError, ValueError):
            return Response(status=status.HTTP_400_BAD_REQUEST)
        entry = UserLibraryEntry.objects.filter(
            library=library,
            user_game_id=ug_pk,
            user_game__user=request.user,
        ).first()
        if not entry:
            return Response(status=status.HTTP_404_NOT_FOUND)
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class PublicUserCollectionsView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicUserLibrarySerializer

    def get_queryset(self):
        pseudo = self.kwargs["pseudo"]
        owner = get_object_or_404(get_user_model(), pseudo=pseudo)
        return (
            UserLibrary.objects.filter(user=owner, is_visible_on_profile=True)
            .annotate(games_count=Count("entries", distinct=True))
            .order_by("sort_order", "id")
        )
