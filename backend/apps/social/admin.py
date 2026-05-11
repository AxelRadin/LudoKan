from django.contrib import admin

from apps.social.models import FriendRequest, Friendship


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ("id", "user_a", "user_b", "created_at")
    search_fields = ("user_a__pseudo", "user_b__pseudo")


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "from_user", "to_user", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("from_user__pseudo", "to_user__pseudo")
