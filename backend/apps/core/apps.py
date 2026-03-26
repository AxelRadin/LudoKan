from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.core"

    def ready(self):
        from . import celery_signals  # noqa: F401
        from . import signals  # noqa: F401

        signals.connect_review_signal()
