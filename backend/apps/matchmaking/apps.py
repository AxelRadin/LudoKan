from django.apps import AppConfig


class MatchmakingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.matchmaking"
    verbose_name = "Matchmaking"

    def ready(self) -> None:
        # Enregistre les signaux liés au matchmaking (notifications, etc.)
        from . import signals  # noqa: F401

        return super().ready()
