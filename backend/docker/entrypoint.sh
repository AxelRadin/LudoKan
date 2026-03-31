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

# Lancer le serveur ASGI (Daphne) pour supporter HTTP + WebSockets.
# On pointe sur config.asgi:application, qui contient ProtocolTypeRouter.
echo "🚀 Démarrage du serveur..."
watchfiles "daphne -b 0.0.0.0 -p 8000 config.asgi:application" .