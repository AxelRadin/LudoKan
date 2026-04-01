#!/usr/bin/env sh
set -e

echo "🗄️ Migrations..."
python manage.py migrate --noinput

echo "🎨 Collect static..."
python manage.py collectstatic --noinput

echo "🌐 Synchronise site..."
python manage.py sync_site

echo "🚀 Gunicorn..."
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --threads 2 \
  --timeout 60
