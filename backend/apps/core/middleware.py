from django.core.cache import cache
from django.utils import timezone

from .logging_utils import log_system_event


class ActivityAnomalyMiddleware:
    """
    Middleware pour détecter des pics ou anomalies d'activité par IP ou utilisateur.
    Il utilise le cache (Redis) pour compter le nombre de requêtes.
    """

    # Limite en nombre de requêtes par minute
    LIMIT_PER_MINUTE = 200

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        ip = self.get_client_ip(request)
        if ip:
            self._check_anomaly(ip, getattr(request, "user", None))

        return self.get_response(request)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            # Récupérer la vraie IP d'origine à travers un reverse proxy
            return x_forwarded_for.split(",")[0].strip()
        # Sinon prendre REMOTE_ADDR
        return request.META.get("REMOTE_ADDR")

    def _check_anomaly(self, ip, user):

        # Ignorer le locahost ou testserver dans certains cas si besoin
        if ip in ("127.0.0.1", "localhost", "testserver"):
            # Optional: return here to ignore dev environments
            pass

        identifier = f"anomaly_check:{ip}"
        if user and user.is_authenticated:
            identifier += f":usr_{user.id}"

        requests = cache.get(identifier, 0)
        requests += 1

        # Mettre à jour avec un timeout de 60 secondes (1 minute)
        cache.set(identifier, requests, timeout=60)

        # Si ça dépasse la limite fixée EXACTEMENT sur cette requête
        if requests == self.LIMIT_PER_MINUTE:
            # On génère un system log
            metadata = {
                "ip": ip,
                "requests_last_minute": requests,
                "user_detected": user.id if user and user.is_authenticated else None,
                "timestamp_anomaly": timezone.now().isoformat(),
            }
            log_system_event(
                event_type="activity_anomaly",
                description=f"Spike d'activité / Spam détecté venant de {ip}",
                user=user if user and user.is_authenticated else None,
                metadata=metadata,
            )
        # Note: on ne loggue qu'une seule fois au palier (200), puis ça re-compte
