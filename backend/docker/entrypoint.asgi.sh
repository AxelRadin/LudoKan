#!/usr/bin/env sh
set -e

echo "🚀 Daphne (ASGI / WebSocket)..."
exec daphne -b 0.0.0.0 -p 8001 config.asgi:application
