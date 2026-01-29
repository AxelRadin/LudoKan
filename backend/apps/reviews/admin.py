from django.contrib import admin

from apps.reviews.models import ContentReport, Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Configuration de l'interface d'administration pour les Reviews.
    """

    list_display = ["user", "game", "date_created", "content_preview", "rating"]
    list_filter = ["game", "user", "date_created"]
    search_fields = ["user__pseudo", "user__email", "game__name", "content"]
    readonly_fields = ["date_created", "date_modified"]

    fieldsets = (
        ("Informations principales", {"fields": ("user", "game", "rating")}),
        ("Contenu", {"fields": ("content",)}),
        ("Dates", {"fields": ("date_created", "date_modified"), "classes": ("collapse",)}),
    )

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

    list_display = ("reporter", "target_type", "target_id", "created_at", "reason_preview")
    list_filter = ("target_type", "created_at")
    search_fields = ("reporter__email", "reporter__pseudo", "target_type", "target_id", "reason")
    readonly_fields = ("created_at",)

    def reason_preview(self, obj):
        if len(obj.reason) > 50:
            return obj.reason[:50] + "..."
        return obj.reason

    reason_preview.short_description = "Raison"
