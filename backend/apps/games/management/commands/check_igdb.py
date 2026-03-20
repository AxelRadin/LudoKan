"""
Commande de diagnostic pour l'authentification IGDB/Twitch.

Usage (dans le conteneur ou en local) :
    python manage.py check_igdb

Vérifie que TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET (ou IGDB_ACCESS_TOKEN) sont
correctement configurés et que l'appel à l'API IGDB fonctionne.
"""

from decouple import config as env_config
from django.core.management.base import BaseCommand

from apps.games import igdb_client


def _read_twitch_env():
    twitch_id = (env_config("TWITCH_CLIENT_ID", default="") or "").strip()
    twitch_secret = (env_config("TWITCH_CLIENT_SECRET", default="") or "").strip()
    manual_token = env_config("IGDB_ACCESS_TOKEN", default="").strip()
    return twitch_id, twitch_secret, manual_token


class Command(BaseCommand):
    help = "Vérifier la configuration et l'authentification IGDB/Twitch"

    def handle(self, *args, **options):
        self.stdout.write("\n=== Diagnostic IGDB ===\n")
        twitch_id, twitch_secret, manual_token = _read_twitch_env()

        if not self._print_mode_and_validate(twitch_id, twitch_secret, manual_token):
            return
        if not self._print_and_check_headers():
            return
        self._run_igdb_smoke_test(twitch_id, twitch_secret, manual_token)

    def _print_mode_and_validate(self, twitch_id: str, twitch_secret: str, manual_token: str) -> bool:
        if twitch_id and twitch_secret:
            self.stdout.write("Mode: Option 1 (Twitch OAuth)")
            self.stdout.write(f"  TWITCH_CLIENT_ID: défini (longueur {len(twitch_id)})")
            self.stdout.write("  TWITCH_CLIENT_SECRET: défini")
            return True
        if manual_token:
            self.stdout.write("Mode: Option 2 (token manuel)")
            self.stdout.write(f"  IGDB_ACCESS_TOKEN: défini (longueur {len(manual_token)})")
            self.stdout.write(
                self.style.WARNING(
                    "\n  ⚠ IGDB_ACCESS_TOKEN doit être l'App Access Token (réponse de POST id.twitch.tv/oauth2/token), "
                    "PAS le Client Secret. Préférez TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (Option 1)."
                )
            )
            return True
        self.stdout.write(self.style.ERROR("Aucune config IGDB trouvée. Définir TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET ou IGDB_ACCESS_TOKEN."))
        return False

    def _print_and_check_headers(self) -> bool:
        try:
            headers = igdb_client.get_igdb_headers()
            token_preview = headers.get("Authorization") or ""
            token_len = len(token_preview) - 7 if token_preview.startswith("Bearer ") else 0
            self.stdout.write(f"  Token pour IGDB: Bearer ... (longueur token: {token_len})")
            return True
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  Erreur get_igdb_headers: {e}"))
            return False

    def _run_igdb_smoke_test(self, twitch_id: str, twitch_secret: str, manual_token: str) -> None:
        self.stdout.write("\nAppel IGDB (games, limit 1)...")
        try:
            data = igdb_client.igdb_request("games", "fields id,name; limit 1;")
            if isinstance(data, list):
                self.stdout.write(self.style.SUCCESS(f"  OK — IGDB a répondu ({len(data)} jeu(x))."))
                if len(data) > 0:
                    self.stdout.write(f"  Exemple: id={data[0].get('id')}, name={data[0].get('name')}")
            else:
                self.stdout.write(self.style.WARNING(f"  Réponse inattendue: {type(data)}"))
        except Exception as e:
            self._write_igdb_error_help(e, twitch_id, twitch_secret, manual_token)

        self.stdout.write("")

    def _write_igdb_error_help(self, e: Exception, twitch_id: str, twitch_secret: str, manual_token: str) -> None:
        self.stdout.write(self.style.ERROR(f"  Erreur IGDB: {e}"))
        err_str = str(e).lower()
        if "401" in err_str and manual_token and not (twitch_id and twitch_secret):
            self.stdout.write(
                self.style.WARNING(
                    "\n→ Vous êtes en Option 2 : IGDB_ACCESS_TOKEN doit être le token reçu de Twitch OAuth\n"
                    "  (POST https://id.twitch.tv/oauth2/token avec client_id, client_secret, grant_type=client_credentials),\n"
                    "  pas le Client Secret. Solution recommandée : ajoutez dans .env :\n"
                    "  TWITCH_CLIENT_ID=votre_client_id\n"
                    "  TWITCH_CLIENT_SECRET=votre_client_secret\n"
                    "  puis redémarrez le conteneur (Option 1 récupère le token automatiquement)."
                )
            )
        else:
            self.stdout.write("\nEn cas de 401: app Twitch en 'Confidential', et Client ID + Client Secret (pas le Secret dans Authorization).")
