import os
import requests
from django.core.exceptions import ImproperlyConfigured

IGDB_BASE_URL = "https://api.igdb.com/v4"


def get_igdb_headers():
    client_id = os.getenv("IGDB_CLIENT_ID")
    access_token = os.getenv("IGDB_ACCESS_TOKEN")

    if not client_id:
        raise ImproperlyConfigured("IGDB_CLIENT_ID is not set in environment variables")
    if not access_token:
        raise ImproperlyConfigured("IGDB_ACCESS_TOKEN is not set in environment variables")

    return {
        "Client-ID": client_id,
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }


def igdb_request(endpoint: str, query: str):
    url = f"{IGDB_BASE_URL}/{endpoint.lstrip('/')}"
    headers = get_igdb_headers()

    resp = requests.post(url, data=query, headers=headers, timeout=10)

    if not resp.ok:
        # LOG ERREUR IGDB
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text

        raise RuntimeError(
            f"IGDB error {resp.status_code} on {endpoint}: {detail}"
        )

    return resp.json()
