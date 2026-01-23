from django.contrib import admin

from apps.game_tickets.models import GameTicket


@admin.register(GameTicket)
class GameTicketAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "game_name",
        "user",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "game_name",
        "publisher",
        "description",
        "user__email",
    )

    autocomplete_fields = (
        "genres",
        "platforms",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Game info",
            {
                "fields": (
                    "game_name",
                    "description",
                    "publisher",
                    "year",
                    "players",
                    "age",
                )
            },
        ),
        (
            "Classification",
            {
                "fields": (
                    "genres",
                    "platforms",
                )
            },
        ),
        (
            "Workflow",
            {
                "fields": (
                    "user",
                    "status",
                )
            },
        ),
        (
            "Metadata",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
