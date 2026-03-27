from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.chat"

    def ready(self) -> None:
        # Enregistre les signaux liés aux messages (notifications, etc.)
        from . import signals  # noqa: F401

        return super().ready()
