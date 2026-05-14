FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 

WORKDIR /app

RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends gcc libpq-dev gettext \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
COPY requirements-dev.txt .

RUN python -m pip install --upgrade "pip==26.1.1" \
    && pip install --root-user-action=ignore \
        --only-binary=:all: \
        --no-binary=dj-rest-auth,ms-cv \
        -r requirements.txt \
    && pip install --root-user-action=ignore --only-binary=:all: -r requirements-dev.txt

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
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh \
    && sed -i 's/\r//' /app/docker/entrypoint.celery.sh && chmod +x /app/docker/entrypoint.celery.sh

USER app

EXPOSE 8000

CMD ["/entrypoint.sh"]
