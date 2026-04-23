from django.contrib import admin

from apps.parties.models import GameParty, GamePartyMember


class GamePartyMemberInline(admin.TabularInline):
    model = GamePartyMember
    extra = 0
    readonly_fields = ("joined_at", "updated_at")


@admin.register(GameParty)
class GamePartyAdmin(admin.ModelAdmin):
    list_display = ("id", "game", "status", "max_players", "chat_room", "created_at", "updated_at")
    list_filter = ("status", "created_at")
    search_fields = ("id", "game__name")
    readonly_fields = ("created_at", "updated_at")
    inlines = [GamePartyMemberInline]


@admin.register(GamePartyMember)
class GamePartyMemberAdmin(admin.ModelAdmin):
    list_display = ("id", "party", "user", "membership_status", "ready_state", "ready_for_chat_state", "joined_at")
    list_filter = ("membership_status", "ready_state", "ready_for_chat_state", "joined_at")
    search_fields = ("party__id", "user__email", "user__pseudo")
    readonly_fields = ("joined_at", "updated_at")
