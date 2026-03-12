import logging

from rest_framework.views import exception_handler

logger_system = logging.getLogger("system_logs")


def custom_exception_handler(exc, context):
    """
    Handler d'exceptions custom pour normaliser les réponses d'erreur.
    Logue les erreurs serveur (5xx) et les échecs API critiques dans system_logs

    Structure de réponse:
    {
        "success": False,
        "errors": { ... erreurs DRF ... }
    }
    """
    response = exception_handler(exc, context)

    if response is not None and response.status_code >= 500:
        logger_system.error(
            "API server error: %s",
            str(exc),
            extra={
                "event_type": "api_fail",
                "status_code": response.status_code,
                "view": str(context.get("view")),
                "request_path": context.get("request").path if context.get("request") else None,
            },
        )
    elif response is not None and isinstance(response.data, dict):
        pass  # on normalise plus bas

    if response is not None and isinstance(response.data, dict):
        response.data = {
            "success": False,
            "errors": response.data,
        }

    return response
