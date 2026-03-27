from django.apps import AppConfig


class ReviewsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.reviews"
    verbose_name = "Reviews"

    def ready(self) -> None:
        # Enregistre les signaux liés aux avis (notifications, etc.)
        from . import signals  # noqa: F401

        return super().ready()
