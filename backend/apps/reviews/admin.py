from django.contrib import admin

from apps.reviews.models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """
    Configuration de l'interface d'administration pour les Reviews.
    """

    list_display = ["user", "game", "date_created", "content_preview", "rating"]
    list_filter = ["game", "user", "date_created"]
    search_fields = ["user__username", "game__name", "content"]
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
