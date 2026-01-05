from django.apps import AppConfig


class RealtimeConfig(AppConfig):
    """
    Configuration de l'app realtime, dédiée aux fonctionnalités temps réel
    (WebSockets, Channels, etc.).
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.realtime"

    def ready(self) -> None:
        # Enregistre les signaux (notifications temps réel, etc.)
        from . import signals  # noqa: F401

        return super().ready()
