# Production image (Railway and the CI end-to-end tests): one container serves the API,
# the admin and the built frontend. The Dockerfiles in backend/ and frontend/ are for local
# development with Docker Compose only.

# --- 1. Frontend build -------------------------------------------------------------------
FROM node:22-alpine AS frontend
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit
COPY frontend/ ./
# The build fails if a size budget is exceeded (docs/MOTION-PLAN.md §5).
RUN npm run build && npm run budgets

# --- 2. Django + gunicorn ----------------------------------------------------------------
FROM python:3.13-slim AS app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1 \
    PATH="/opt/venv/bin:$PATH" \
    DJANGO_STATIC_MANIFEST=true

RUN pip install --no-cache-dir uv && useradd --create-home --uid 1000 app
WORKDIR /app

# Runtime dependencies only (no pytest/ruff), cached until the lockfile changes.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev

COPY backend/ ./
COPY --from=frontend /frontend/dist ./frontend_dist

# Pre-compress the frontend (WhiteNoise serves the .gz variants) and collect the admin/DRF
# static files. collectstatic only needs settings to import: the values below are
# throwaway placeholders for this build step, never used at runtime.
RUN python -m whitenoise.compress frontend_dist \
    && DJANGO_SECRET_KEY=build-time-placeholder-not-a-secret-only-for-collectstatic-0000 \
       DATABASE_URL=sqlite:////tmp/collectstatic.sqlite3 \
       python manage.py collectstatic --noinput

USER app
EXPOSE 8080

# Migrations are not run here: on Railway they run once per deploy (Pre-deploy Command), so
# waking up from App Sleeping only starts gunicorn.
CMD ["sh", "-c", "exec gunicorn config.wsgi --bind 0.0.0.0:${PORT:-8080} --workers ${WEB_CONCURRENCY:-2} --threads 2 --timeout 30 --access-logfile -"]
