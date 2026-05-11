from django.apps import AppConfig


class LibraryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.library"

    def ready(self):
        from . import signals  # noqa: F401

        return super().ready()
