from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Handler d'exceptions custom pour normaliser les réponses d'erreur.

    Structure de réponse:
    {
        "success": False,
        "errors": { ... erreurs DRF ... }
    }
    """
    response = exception_handler(exc, context)

    if response is not None and isinstance(response.data, dict):
        response.data = {
            "success": False,
            "errors": response.data,
        }

    return response


