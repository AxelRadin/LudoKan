# Dockerfile DEV pour Django
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Déps système (psycopg, build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Installer deps avant de copier tout le code -> meilleur cache
COPY requirements.txt .
COPY requirements-dev.txt .
RUN python -m pip install --upgrade pip \
    && pip install -r requirements.txt \
    && pip install -r requirements-dev.txt

# Copier le code
COPY . .

# Créer user non-root
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

# Entrypoint pour faire migrations etc.
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER app

EXPOSE 8000

CMD ["/entrypoint.sh"]
