import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


def verify_recaptcha(token: str, *, remote_ip: str | None = None) -> bool:
    """
    Vérifie le jeton auprès de Google. Ne journalise jamais la clé secrète ni le jeton complet.
    """
    secret = (getattr(settings, "RECAPTCHA_SECRET_KEY", None) or "").strip()
    if not secret:
        logger.warning("reCAPTCHA: abandon — RECAPTCHA_SECRET_KEY vide ou absente (vérifier .env / Docker env_file).")
        return False
    if not token or not str(token).strip():
        logger.warning("reCAPTCHA: abandon — jeton absent ou vide après strip.")
        return False

    token_s = str(token).strip()
    token_len = len(token_s)
    secret_configured = bool(secret)
    send_ip = bool(remote_ip) and getattr(settings, "RECAPTCHA_SEND_REMOTEIP", False)
    logger.info(
        "reCAPTCHA: appel siteverify (secret_configuré=%s, longueur_secret=%s, longueur_jeton=%s, " "envoi_remoteip=%s client_ip_connu=%s)",
        secret_configured,
        len(secret),
        token_len,
        send_ip,
        bool(remote_ip),
    )
    if token_len > 2000:
        logger.warning(
            "reCAPTCHA: jeton très long (%s car.) — si l’échec persiste, vérifier que la clé est bien "
            "« reCAPTCHA v2 case à cocher » (pas Enterprise / pas v3 seul avec ce backend).",
            token_len,
        )

    data = {"secret": secret, "response": token_s}
    if send_ip:
        data["remoteip"] = remote_ip

    try:
        response = requests.post(RECAPTCHA_VERIFY_URL, data=data, timeout=5)
        logger.info("reCAPTCHA: réponse HTTP siteverify status=%s", response.status_code)

        try:
            payload = response.json()
        except ValueError:
            logger.warning(
                "reCAPTCHA: siteverify corps non-JSON status=%s extrait=%r",
                response.status_code,
                (response.text or "")[:200],
            )
            return False

        if payload.get("success"):
            logger.info("reCAPTCHA: siteverify succès (success=true).")
            return True

        # Codes documentés : https://developers.google.com/recaptcha/docs/verify
        codes = payload.get("error-codes") or []
        logger.warning(
            "reCAPTCHA: siteverify refusé success=false error-codes=%s payload_keys=%s",
            codes,
            list(payload.keys()),
        )
        return False
    except requests.RequestException:
        logger.exception("reCAPTCHA: erreur réseau lors de l'appel siteverify")
        return False
