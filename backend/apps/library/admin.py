from django.contrib import admin
from .models import UserGame

@admin.register(UserGame)
class UserGameAdmin(admin.ModelAdmin):
    list_display = ("user", "game", "status", "date_added")
    list_filter = ("status",)
    search_fields = ("user__email", "game__title")
