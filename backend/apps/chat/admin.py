from django.contrib import admin

from apps.chat.models import ChatRoom, ChatRoomUser, Message


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "created_at", "updated_at")
    list_filter = ("type", "created_at")
    search_fields = ("id",)


@admin.register(ChatRoomUser)
class ChatRoomUserAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "user", "created_at")
    list_filter = ("created_at",)
    search_fields = ("room__id", "user__email", "user__pseudo")


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "room", "user", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("room__id", "user__email", "user__pseudo", "content")
