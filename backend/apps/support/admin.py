from django.contrib import admin

from .models import SupportTicket


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ("id", "subject", "category", "status", "user", "created_at")
    list_filter = ("status", "category")
    search_fields = ("subject", "body", "user__email", "user__pseudo")
    readonly_fields = ("created_at", "updated_at")
