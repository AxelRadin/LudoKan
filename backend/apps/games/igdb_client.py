"""
Client IGDB — aligné sur l'ancien backend Express (backend/src/server.ts).

Flux identique à Node :
  1. Token : POST https://id.twitch.tv/oauth2/token
     body form-encoded : client_id, client_secret, grant_type=client_credentials
  2. IGDB  : POST https://api.igdb.com/v4/<endpoint>
     headers : Client-ID, Authorization: Bearer <token>, Content-Type: text/plain
     body : chaîne de requête APICalypse (texte brut)

Variables d'environnement (comme en Node) : TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET.
En option : IGDB_ACCESS_TOKEN + IGDB_CLIENT_ID si pas de Twitch.
"""

import time
from urllib.parse import urlencode

import requests
from decouple import config as env_config
from django.core.exceptions import ImproperlyConfigured

IGDB_BASE_URL = "https://api.igdb.com/v4"
TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"

_twitch_token_cache = {"access_token": None, "expires_at": 0}
_TOKEN_BUFFER_MS = 60_000  # comme Node : renouveler 60s avant expiration


def _clear_twitch_token_cache():
    _twitch_token_cache["access_token"] = None
    _twitch_token_cache["expires_at"] = 0


def get_twitch_access_token():
    """
    Même logique que getAccessToken() dans server.ts (Express).
    Utilise uniquement TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET.
    """
    now_ms = time.time() * 1000
    if _twitch_token_cache["access_token"] and now_ms < _twitch_token_cache["expires_at"] - _TOKEN_BUFFER_MS:
        return _twitch_token_cache["access_token"]

    # Comme Node : uniquement ces deux variables
    client_id = (env_config("TWITCH_CLIENT_ID", default="") or "").strip()
    client_secret = (env_config("TWITCH_CLIENT_SECRET", default="") or "").strip()

    if not client_id or not client_secret:
        raise ImproperlyConfigured("TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET sont requis (.env, comme pour le serveur Express).")

    # Même body que Node : URLSearchParams(client_id, client_secret, grant_type)
    body = urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        }
    )
    resp = requests.post(
        TWITCH_TOKEN_URL,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    access_token = data.get("access_token")
    expires_in = int(data.get("expires_in", 0))

    if not access_token:
        raise ImproperlyConfigured("Twitch OAuth n'a pas renvoyé d'access_token.")

    _twitch_token_cache["access_token"] = access_token
    _twitch_token_cache["expires_at"] = now_ms + (expires_in * 1000)
    return access_token


def get_igdb_headers():
    """
    Headers pour IGDB, identiques à server.ts :
    Client-ID, Authorization: Bearer <token>, Content-Type: text/plain
    """
    # Option 1 : Twitch (comme Express)
    twitch_id = (env_config("TWITCH_CLIENT_ID", default="") or "").strip()
    twitch_secret = (env_config("TWITCH_CLIENT_SECRET", default="") or "").strip()
    if twitch_id and twitch_secret:
        token = get_twitch_access_token().strip()
        return {
            "Client-ID": twitch_id,
            "Authorization": f"Bearer {token}",
            "Content-Type": "text/plain",
        }
    # Option 2 : token manuel (fallback si pas de Twitch)
    client_id = (env_config("IGDB_CLIENT_ID", default="") or env_config("TWITCH_CLIENT_ID", default="")).strip()
    token = env_config("IGDB_ACCESS_TOKEN", default="").strip()
    if not client_id or not token:
        raise ImproperlyConfigured("Définir TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (recommandé), " "ou IGDB_CLIENT_ID + IGDB_ACCESS_TOKEN.")
    return {
        "Client-ID": client_id,
        "Authorization": f"Bearer {token}",
        "Content-Type": "text/plain",
    }


def igdb_request(endpoint: str, query: str):
    """
    POST vers IGDB, comme axios.post dans server.ts :
    body = chaîne de requête (texte brut), headers = Client-ID, Authorization, Content-Type: text/plain
    """
    url = f"{IGDB_BASE_URL}/{endpoint.lstrip('/')}"
    headers = get_igdb_headers()
    # Body en texte brut (Node envoie la string telle quelle)
    body = query if isinstance(query, bytes) else query.encode("utf-8")

    resp = requests.post(url, data=body, headers=headers, timeout=10)

    if not resp.ok:
        if resp.status_code == 401:
            _clear_twitch_token_cache()
            headers = get_igdb_headers()
            resp = requests.post(url, data=body, headers=headers, timeout=10)
            if resp.ok:
                return resp.json()
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        raise RuntimeError(f"IGDB error {resp.status_code} on {endpoint}: {detail}")

    return resp.json()
