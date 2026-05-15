from django.contrib.auth import get_user_model
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.games.models import Game
from apps.library.models import UserGame, UserLibrary, UserLibraryEntry
from apps.library.serializers import LibraryPrivacySerializer, PublicUserLibrarySerializer, UserGameSerializer, UserLibrarySerializer
from apps.library.services_collections import ensure_ma_ludotheque
from apps.library.tasks import sync_steam_library_task, sync_xbox_library_task
from apps.library.visibility import collections_visible_to_viewer_queryset, viewer_can_see_collection, visible_user_games_queryset
from apps.social.blocking import pair_has_block


def _assert_public_owner_not_blocked(request, owner) -> None:
    viewer = request.user if request.user.is_authenticated else None
    if viewer and pair_has_block(viewer, owner):
        raise NotFound()


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


class XboxSyncThrottle(UserRateThrottle):
    rate = "1/min"


class XboxSyncView(APIView):
    """
    Déclenche la synchronisation de la bibliothèque Xbox en asynchrone via Celery.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [XboxSyncThrottle]

    @extend_schema(
        summary="Synchroniser la bibliothèque Xbox",
        description="Lance une tâche asynchrone pour mettre à jour les jeux depuis Xbox Live.\nLimité à 1 appel par minute par utilisateur.",
        responses={
            202: {"description": "Synchronisation lancée en arrière-plan."},
            429: {"description": "Trop de requêtes. Veuillez patienter."},
        },
    )
    def post(self, request, *args, **kwargs):
        # We start the Celery task safely
        sync_xbox_library_task.delay(request.user.id)

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


class LibraryPrivacyView(APIView):
    """
    GET/PATCH visibilité de la ludothèque complète (collection système MA_LUDOTHEQUE).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        lib = ensure_ma_ludotheque(request.user)
        return Response(LibraryPrivacySerializer(lib).data)

    def patch(self, request):
        lib = ensure_ma_ludotheque(request.user)
        ser = LibraryPrivacySerializer(lib, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(LibraryPrivacySerializer(lib).data)


class PublicUserCollectionsView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicUserLibrarySerializer

    def get_queryset(self):
        pseudo = self.kwargs["pseudo"]
        owner = get_object_or_404(get_user_model(), pseudo=pseudo)
        _assert_public_owner_not_blocked(self.request, owner)
        viewer = self.request.user if self.request.user.is_authenticated else None
        return (
            collections_visible_to_viewer_queryset(owner, viewer)
            .exclude(system_key=UserLibrary.SystemKey.MA_LUDOTHEQUE)
            .annotate(games_count=Count("entries", distinct=True))
            .order_by("sort_order", "id")
        )


class PublicUserGamesView(ListAPIView):
    """Jeux visibles sur le profil (collections publiques ou « amis » si applicable)."""

    permission_classes = [AllowAny]
    serializer_class = UserGameSerializer

    def get_queryset(self):
        pseudo = self.kwargs["pseudo"]
        owner = get_object_or_404(get_user_model(), pseudo=pseudo)
        _assert_public_owner_not_blocked(self.request, owner)
        viewer = self.request.user if self.request.user.is_authenticated else None
        return (
            visible_user_games_queryset(owner, viewer)
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


class PublicUserCollectionGamesView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = UserGameSerializer

    def get_queryset(self):
        pseudo = self.kwargs["pseudo"]
        pk = int(self.kwargs["pk"])
        owner = get_object_or_404(get_user_model(), pseudo=pseudo)
        _assert_public_owner_not_blocked(self.request, owner)
        viewer = self.request.user if self.request.user.is_authenticated else None
        library = get_object_or_404(UserLibrary, pk=pk, user=owner)

        if not viewer_can_see_collection(owner_id=owner.pk, viewer=viewer, library=library):
            return UserGame.objects.none()
        return (
            UserGame.objects.filter(user=owner, library_entries__library_id=library.pk)
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
            .distinct()
        )


class GamesInCommonView(ListAPIView):
    """Jeux présents dans les ludothèques des deux utilisateurs (amis uniquement)."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserGameSerializer

    def list(self, request, *args, **kwargs):
        pseudo = self.kwargs["pseudo"]
        owner = get_object_or_404(get_user_model(), pseudo=pseudo)
        _assert_public_owner_not_blocked(request, owner)
        from apps.social.utils import are_friends

        if not are_friends(request.user, owner):
            raise PermissionDenied("Seuls les amis peuvent voir les jeux en commun.")
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        pseudo = self.kwargs["pseudo"]
        owner = get_object_or_404(get_user_model(), pseudo=pseudo)
        my_game_ids = UserGame.objects.filter(user=self.request.user).values_list("game_id", flat=True)
        return (
            UserGame.objects.filter(user=owner, game_id__in=my_game_ids)
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
            .distinct()
        )
