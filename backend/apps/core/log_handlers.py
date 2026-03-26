import logging
import traceback

from django.core.handlers.wsgi import WSGIRequest


class SystemLogHandler(logging.Handler):
    """
    Handler de log personnalisé qui sauvegarde les événements dans le modèle SystemLog.
    """

    def emit(self, record):
        # Pour éviter des imports circulaires au démarrage de Django
        from apps.core.models import SystemLog

        try:
            # Extraire les infos pertinentes du record
            event_type = record.name or "system_log"
            description = record.getMessage()

            # Construire des métadonnées enrichies
            metadata = {
                "level": record.levelname,
                "module": record.module,
                "funcName": record.funcName,
                "lineNo": record.lineno,
                "process": record.process,
                "thread": record.thread,
            }

            # Si l'exception de record.exc_info existe
            if record.exc_info:
                metadata["traceback"] = "".join(traceback.format_exception(*record.exc_info))

            # Tenter d'extraire la requête courante (et l'utilisateur si possible)
            user = None
            if hasattr(record, "request") and isinstance(record.request, WSGIRequest):
                metadata["path"] = record.request.path
                metadata["method"] = record.request.method

                # Extraire le corps de requête de manière safe
                try:
                    metadata["body"] = record.request.body.decode("utf-8")[:500] if hasattr(record.request, "body") else None
                except Exception:
                    metadata["body"] = "unparseable_body"

                if hasattr(record.request, "user") and record.request.user.is_authenticated:
                    user = record.request.user

            # Pour loguer les dict de contexte (extra) dans python logging
            if hasattr(record, "metadata") and isinstance(record.metadata, dict):
                metadata.update(record.metadata)

            # S'il y a plus d'attributs supplémentaires passés (via dict "extra" kwargs) qu'on veut extraire, ex status_code
            if hasattr(record, "status_code"):
                metadata["status_code"] = record.status_code
                if record.status_code >= 500:
                    event_type = "server_error"

            SystemLog.objects.create(
                event_type=event_type,
                description=description[:1000] if len(description) > 1000 else description,
                user=user,
                metadata=metadata,
            )
        except Exception as e:
            # Fallback local (stdout/stderr) en cas d'erreur DANS notre handler
            # (par exemple DB injoignable)
            print(f"Failed to save system log to DB: {e}")
