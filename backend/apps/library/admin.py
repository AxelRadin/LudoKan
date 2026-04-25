from django.contrib import admin

from .models import UserGame, UserLibrary, UserLibraryEntry


@admin.register(UserGame)
class UserGameAdmin(admin.ModelAdmin):
    list_display = ("user", "game", "status", "date_added")
    list_filter = ("status",)
    search_fields = ("user__email", "game__name")


@admin.register(UserLibrary)
class UserLibraryAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "system_key", "is_visible_on_profile", "sort_order")
    list_filter = ("system_key", "is_visible_on_profile")
    search_fields = ("name", "user__pseudo", "user__email")


@admin.register(UserLibraryEntry)
class UserLibraryEntryAdmin(admin.ModelAdmin):
    list_display = ("library", "user_game", "date_added")
    list_filter = ("library",)
