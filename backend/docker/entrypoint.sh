#!/usr/bin/env bash
set -e

# Attendre que la DB soit prête
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

python manage.py migrate --noinput
# Optionnel: python manage.py collectstatic --noinput
python manage.py runserver 0.0.0.0:8000
