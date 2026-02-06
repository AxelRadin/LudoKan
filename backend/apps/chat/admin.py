from django.contrib import admin

from apps.chat.models import ChatRoom, ChatRoomUser, Message, MessageRead


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
    list_display = ("id", "room", "user", "created_at")
    list_filter = ("created_at",)
    search_fields = ("room__id", "user__email", "user__pseudo", "content")


@admin.register(MessageRead)
class MessageReadAdmin(admin.ModelAdmin):
    list_display = ("id", "message", "user", "read_at")
    list_filter = ("read_at",)
    search_fields = ("message__id", "user__email", "user__pseudo")
