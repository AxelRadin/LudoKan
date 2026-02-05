from django.contrib import admin, messages
from import_export import resources
from import_export.admin import ImportExportModelAdmin

from apps.users.utils import log_admin_action

from .models import Game, Genre, Platform, Publisher, Rating


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ("name", "website")
    search_fields = ("name",)
    list_filter = ()


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ("nom_plateforme",)
    search_fields = ("nom_plateforme",)


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("nom_genre",)
    search_fields = ("nom_genre",)


class GameResource(resources.ModelResource):
    class Meta:
        model = Game
        fields = (
            "id",
            "name",
            "status",
            "release_date",
            "publisher",
            "average_rating",
            "rating_count",
            "rating_avg",
            "popularity_score",
            "created_at",
            "updated_at",
        )
        export_order = fields
        import_id_fields = ("id",)


@admin.register(Game)
class GameAdmin(ImportExportModelAdmin):
    resource_class = GameResource

    list_display = ("name", "publisher", "average_rating", "rating_count", "rating_avg", "popularity_score")
    search_fields = ("name", "publisher__name")
    list_filter = ("publisher", "genres", "platforms", "status")
    list_select_related = ("publisher",)
    date_hierarchy = "created_at"

    def has_import_permission(self, request, *args, **kwargs):
        from apps.users.permissions import has_permission

        return has_permission(request.user, "import_export.game")

    def has_export_permission(self, request, *args, **kwargs):
        return bool(getattr(request.user, "is_staff", False))


@admin.action(description="Supprimer les notes sélectionnées (avec log)")
def delete_ratings_with_log(modeladmin, request, queryset):
    """
    Action de modération pour supprimer des ratings tout en loggant l'action.
    """
    actor = request.user
    deleted_count = 0

    # On utilise select_related pour optimiser les accès à user/game
    for rating in queryset.select_related("user", "game"):
        log_admin_action(
            admin_user=actor,
            action_type="rating.delete",
            target_type="rating",
            target_id=rating.pk,
            description=f"Suppression de la note #{rating.pk} via Django admin",
        )
        rating.delete()
        deleted_count += 1

    if deleted_count:
        modeladmin.message_user(
            request,
            f"{deleted_count} note(s) ont été supprimées et loggées.",
            level=messages.SUCCESS,
        )


class RatingResource(resources.ModelResource):
    class Meta:
        model = Rating
        fields = (
            "id",
            "user",
            "game",
            "rating_type",
            "value",
            "date_created",
            "date_modified",
        )
        export_order = fields
        import_id_fields = ("id",)


@admin.register(Rating)
class RatingAdmin(ImportExportModelAdmin):
    resource_class = RatingResource

    list_display = ("user", "game", "rating_type", "value", "date_created")
    search_fields = ("user__pseudo", "user__email", "game__name")
    list_filter = ("rating_type", "date_created")
    list_select_related = ("user", "game")
    date_hierarchy = "date_created"
    actions = [delete_ratings_with_log]

    def has_import_permission(self, request, *args, **kwargs):
        from apps.users.permissions import has_permission

        return has_permission(request.user, "import_export.rating")

    def has_export_permission(self, request, *args, **kwargs):
        return bool(getattr(request.user, "is_staff", False))
