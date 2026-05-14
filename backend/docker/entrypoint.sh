#!/usr/bin/env bash
set -e

# Attendre que la DB soit prête
echo "🔍 Attente de la base de données..."
python - <<'PY'
import time, os
import psycopg2
from urllib.parse import urlparse
url = urlparse(os.environ["DATABASE_URL"])
for _ in range(30):
    try:
        psycopg2.connect(
            dbname=url.path.lstrip('/'),
            user=url.username, password=url.password,
            host=url.hostname, port=url.port
        ).close()
        break
    except Exception:
        time.sleep(1)
else:
    raise SystemExit("Database not ready")
PY

echo "🗄️ Mise en place des migrations..."
python manage.py migrate --noinput
# Optionnel: python manage.py collectstatic --noinput

echo "🌐 Synchronisation du site..."
python manage.py sync_site

# Backfill IGDB data une seule fois (si igdb_rating_count non encore rempli)
BACKFILL_NEEDED=$(python - <<'PY'
import django, os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()
from apps.games.models import Game
print("false" if Game.objects.filter(igdb_rating_count__gt=0).exists() else "true")
PY
)

if [[ "$BACKFILL_NEEDED" == "true" ]]; then
  echo "📦 Premier démarrage : import IGDB en cours (peut prendre quelques minutes)..."
  for genre_id in 2 4 5 8 9 10 12 13 15 16 24 25 31 32 33 34; do
    python manage.py import_igdb_popular --genre-id "$genre_id" --from-year 2000 --limit 500 --skip-meta || true
  done
  python manage.py backfill_game_media --only-missing --min-screenshots 4 || true
  echo "✅ Import IGDB terminé."
fi

if [[ "${AUTO_COMPILE_MESSAGES:-false}" = "true" ]]; then
  echo "🌐 Compilation des catalogues gettext (.po → .mo)..."
  python manage.py compilemessages || true
fi

# Lancer le serveur ASGI (Daphne) pour supporter HTTP + WebSockets.
# On pointe sur config.asgi:application, qui contient ProtocolTypeRouter.

echo "🚀 Démarrage du serveur..."
watchfiles --filter python "daphne -b 0.0.0.0 -p 8000 config.asgi:application" .