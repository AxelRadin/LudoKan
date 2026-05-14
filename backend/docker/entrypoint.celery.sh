#!/usr/bin/env bash
set -e

# Même volume ./backend:/app que web : les .mo écrits ici sont visibles par tous les services.
if [[ "${AUTO_COMPILE_MESSAGES:-false}" = "true" ]]; then
  echo "🌐 Celery: compilation des traductions (.po → .mo)..."
  python manage.py compilemessages || true
fi

exec "$@"
