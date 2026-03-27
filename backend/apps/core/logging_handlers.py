import logging
import traceback

_STD_RECORD_ATTRS = frozenset(
    {
        "name",
        "msg",
        "args",
        "levelname",
        "levelno",
        "pathname",
        "filename",
        "exc_info",
        "exc_text",
        "stack_info",
        "lineno",
        "funcName",
        "sinfo",
        "message",
        "taskName",
        "process",
        "processName",
        "thread",
        "threadName",
        "event_type",
        # "user" exclu : géré à part via key == "user" pour ne pas le mettre en metadata
    }
)


def _event_type_from_record(record: logging.LogRecord) -> str:
    """Dérive event_type depuis le record (extra ou levelname)."""
    if getattr(record, "event_type", None):
        return str(record.event_type)
    if record.levelno >= logging.ERROR:
        return "server_error"
    if record.levelno >= logging.WARNING:
        return "warning"
    return "info"


class SystemLogHandler(logging.Handler):
    """
    Handler qui écrit chaque log dans la table SystemLog.
    Utilisé par le logger "system_logs" pour centraliser les événements critiques.
    """

    def emit(self, record: logging.LogRecord) -> None:
        try:
            event_type = _event_type_from_record(record)
            description = record.getMessage()
            user = getattr(record, "user", None)

            metadata = {}
            for key, value in record.__dict__.items():
                if key in _STD_RECORD_ATTRS or value is None:
                    continue
                if key == "user":
                    continue
                try:
                    if isinstance(value, (str, int, float, bool, list, dict)) or value is None:
                        metadata[key] = value
                    else:
                        metadata[key] = str(value)
                except Exception:
                    metadata[key] = "<unserializable>"

            if record.exc_info:
                metadata["traceback"] = "".join(traceback.format_exception(*record.exc_info))

            from .logging_utils import log_system_event

            log_system_event(
                event_type=event_type,
                description=description[:2000] if len(description) > 2000 else description,
                user=user,
                metadata=metadata,
            )
        except Exception:
            self.handleError(record)
