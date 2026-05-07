FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 

WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY requirements-dev.txt .

# Installer deps avant de copier tout le code -> meilleur cache
# Dependencies are pinned in requirements.txt and requirements-dev.txt.
# --only-binary=:all: cannot be enforced because dj-rest-auth==5.0.2 has no compatible wheel for this build and requires source distribution installation.
# Risk accepted for this controlled Docker build.
# NOSONAR: dependencies are pinned; --only-binary cannot be used because dj-rest-auth requires source installation.
RUN python -m pip install --upgrade pip && pip install --root-user-action=ignore -r requirements.txt && pip install --root-user-action=ignore -r requirements-dev.txt # NOSONAR

COPY manage.py ./manage.py
COPY config/ ./config/
COPY apps/ ./apps/
COPY api/ ./api/
COPY docker/ ./docker/
COPY tests/ ./tests/
COPY pyproject.toml ./pyproject.toml
COPY runtime.txt ./runtime.txt
COPY .flake8 ./.flake8
COPY .coveragerc ./.coveragerc
COPY pytest.ini ./pytest.ini
COPY conftest.py ./conftest.py
COPY run_tests.py ./run_tests.py
COPY test_celery.py ./test_celery.py

RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh

USER app

EXPOSE 8000

CMD ["/entrypoint.sh"]
