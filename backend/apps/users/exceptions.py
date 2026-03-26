from rest_framework.views import exception_handler

from apps.core.logging_utils import log_system_event


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

        # Interception pour loguer un échec de login DRF (CSRF, Bad Credentials, etc)
        # qui coupe avant le signal natif Django `user_login_failed` (BACK-021A)
        request = context.get("request")
        if request and request.path == "/api/auth/login/" and response.status_code in [400, 401, 403]:
            try:

                email = getattr(request, "data", {}).get("email", "unknown")

                x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
                if x_forwarded_for:
                    ip = x_forwarded_for.split(",")[0].strip()
                else:
                    ip = request.META.get("REMOTE_ADDR", "unknown")

                reason = str(exc)
                if response.status_code == 403 and "CSRF" in reason:
                    description = f"Login failed for {email} (CSRF error) from IP {ip}"
                else:
                    description = f"Login failed for {email} via DRF from IP {ip}"

                log_system_event(
                    event_type="login_failed",
                    description=description,
                    metadata={"email": email, "ip": ip, "status_code": response.status_code, "reason": reason},
                )
            except Exception:
                pass

    return response
