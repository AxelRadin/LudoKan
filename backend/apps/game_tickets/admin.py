from django.contrib import admin
from django.forms import ModelForm

from apps.game_tickets.models import GameTicket


class GameTicketAdminForm(ModelForm):
    class Meta:
        model = GameTicket
        fields = "__all__"

    def clean_status(self):
        new_status = self.cleaned_data["status"]

        if self.instance.pk:
            old_status = GameTicket.objects.get(pk=self.instance.pk).status
            if old_status != new_status:
                self.instance.change_status(new_status)
                return old_status  # rollback visuel

        return new_status


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
