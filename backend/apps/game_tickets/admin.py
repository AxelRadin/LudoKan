from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.forms import ModelForm

from apps.game_tickets.models import GameTicket
from apps.users.utils import log_admin_action


class GameTicketAdminForm(ModelForm):
    class Meta:
        model = GameTicket
        fields = ["status", "game_name", "description", "publisher", "year", "players", "age", "genres", "platforms", "user"]

    def clean_status(self):
        new_status = self.cleaned_data["status"]

        if self.instance.pk:
            old_status = GameTicket.objects.get(pk=self.instance.pk).status
            if old_status != new_status:
                self.instance.change_status(new_status)
                return old_status

        return new_status


@admin.action(description="Approuver les tickets sélectionnés")
def approve_tickets(modeladmin, request, queryset):
    """
    Action pour approuver des GameTicket en respectant les transitions autorisées.
    """
    actor = request.user
    approved_count = 0
    skipped_count = 0

    for ticket in queryset:
        try:
            # On ne tente la transition que si elle est autorisée
            ticket.change_status(GameTicket.Status.APPROVED)
        except ValidationError:
            skipped_count += 1
            continue

        log_admin_action(
            admin_user=actor,
            action_type="ticket.approve",
            target_type="game_ticket",
            target_id=ticket.pk,
            description=f"Ticket #{ticket.pk} approuvé via Django admin",
        )
        approved_count += 1

    if approved_count:
        modeladmin.message_user(
            request,
            f"{approved_count} ticket(s) ont été approuvés.",
            level=messages.SUCCESS,
        )

    if skipped_count:
        modeladmin.message_user(
            request,
            f"{skipped_count} ticket(s) n'ont pas pu être approuvés (transition de statut invalide).",
            level=messages.WARNING,
        )


@admin.action(description="Rejeter les tickets sélectionnés")
def reject_tickets(modeladmin, request, queryset):
    """
    Action pour rejeter des GameTicket en respectant les transitions autorisées.
    """
    actor = request.user
    rejected_count = 0
    skipped_count = 0

    for ticket in queryset:
        try:
            ticket.change_status(GameTicket.Status.REJECTED)
        except ValidationError:
            skipped_count += 1
            continue

        log_admin_action(
            admin_user=actor,
            action_type="ticket.reject",
            target_type="game_ticket",
            target_id=ticket.pk,
            description=f"Ticket #{ticket.pk} rejeté via Django admin",
        )
        rejected_count += 1

    if rejected_count:
        modeladmin.message_user(
            request,
            f"{rejected_count} ticket(s) ont été rejetés.",
            level=messages.SUCCESS,
        )

    if skipped_count:
        modeladmin.message_user(
            request,
            f"{skipped_count} ticket(s) n'ont pas pu être rejetés (transition de statut invalide).",
            level=messages.WARNING,
        )


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

    list_select_related = ("user",)
    date_hierarchy = "created_at"
    actions = [approve_tickets, reject_tickets]

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
