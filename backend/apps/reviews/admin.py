from django.contrib import admin, messages
from import_export import resources
from import_export.admin import ImportExportModelAdmin

from apps.reviews.models import ContentReport, Review
from apps.users.utils import log_admin_action


class ReviewResource(resources.ModelResource):
    class Meta:
        model = Review
        fields = (
            "id",
            "user",
            "game",
            "rating",
            "content",
            "date_created",
            "date_modified",
        )
        export_order = fields
        import_id_fields = ("id",)


@admin.action(description="Supprimer les avis sélectionnés (avec log)")
def delete_reviews_with_log(modeladmin, request, queryset):
    """
    Action de modération pour supprimer des reviews tout en loggant l'action.
    """
    actor = request.user
    deleted_count = 0

    for review in queryset.select_related("user", "game"):
        log_admin_action(
            admin_user=actor,
            action_type="review.delete",
            target_type="review",
            target_id=review.pk,
            description=f"Suppression de la review #{review.pk} via Django admin",
        )
        review.delete()
        deleted_count += 1

    if deleted_count:
        modeladmin.message_user(
            request,
            f"{deleted_count} avis ont été supprimés et loggés.",
            level=messages.SUCCESS,
        )


@admin.register(Review)
class ReviewAdmin(ImportExportModelAdmin):
    """
    Configuration de l'interface d'administration pour les Reviews.
    """

    resource_class = ReviewResource

    list_display = ["user", "game", "date_created", "content_preview", "rating"]
    list_filter = ["game", "user", "date_created"]
    search_fields = ["user__pseudo", "user__email", "game__name", "content"]
    readonly_fields = ["date_created", "date_modified"]
    list_select_related = ("user", "game", "rating")
    date_hierarchy = "date_created"
    actions = [delete_reviews_with_log]

    fieldsets = (
        ("Informations principales", {"fields": ("user", "game", "rating")}),
        ("Contenu", {"fields": ("content",)}),
        ("Dates", {"fields": ("date_created", "date_modified"), "classes": ("collapse",)}),
    )

    def has_import_permission(self, request, *args, **kwargs):
        from apps.users.permissions import has_permission

        return has_permission(request.user, "import_export.review")

    def has_export_permission(self, request, *args, **kwargs):
        return bool(getattr(request.user, "is_staff", False))

    def content_preview(self, obj):
        """
        Affiche un apercu du contenu (50 premiers caracteres).
        """
        if len(obj.content) > 50:
            return obj.content[:50] + "..."
        return obj.content

    content_preview.short_description = "Apercu du contenu"


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    """
    Interface d'admin pour les signalements de contenu (reviews / ratings).
    """

    list_display = ("reporter", "target_type", "target_id", "handled", "handled_by", "created_at", "reason_preview")
    list_filter = ("target_type", "created_at", "handled")
    search_fields = ("reporter__email", "reporter__pseudo", "target_type", "target_id", "reason")
    readonly_fields = ("created_at",)
    list_select_related = ("reporter", "handled_by")
    date_hierarchy = "created_at"

    def reason_preview(self, obj):
        if len(obj.reason) > 50:
            return obj.reason[:50] + "..."
        return obj.reason

    reason_preview.short_description = "Raison"
