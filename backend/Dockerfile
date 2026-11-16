FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1 \
    PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir uv

# Non-root user; UID 1000 matches the usual host user so files created through the
# bind mount (e.g. new migrations) are not owned by root.
RUN useradd --create-home --uid 1000 app

WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

COPY . .

USER app

EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
