FROM python:3.12-slim
WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy lockfile + manifest first for layer caching
COPY pyproject.toml uv.lock ./

# Install runtime deps only (no dev/test) into project venv from the lock
RUN uv sync --frozen --no-dev --no-cache

# Make the venv the default Python for subsequent RUN/CMD
ENV PATH="/app/.venv/bin:$PATH"
ENV VIRTUAL_ENV="/app/.venv"

# Install gosu for switching to non-root user in entrypoint
RUN apt-get update && \
    apt-get install -y --no-install-recommends gosu && \
    rm -rf /var/lib/apt/lists/*

# Copy application code
COPY src/ src/
COPY alembic/ alembic/
COPY alembic.ini .
COPY scripts/ scripts/

# Article markdown is the canonical SEO content source for both the SPA
# (Vite reads it at build time) and the backend prerender. Copy it in so
# /api/og/articles/{slug} can render the same content server-side.
COPY frontend/src/content/articles/ /app/articles/

# Copy entrypoint script and make it executable and secure
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    chown root:root /usr/local/bin/docker-entrypoint.sh

# Create non-root user for running the application
# UID/GID can be overridden via build args to match host user
ARG APP_UID=1000
ARG APP_GID=1000
RUN groupadd -r -g ${APP_GID} appuser && \
    useradd -r -u ${APP_UID} -g appuser -d /app -s /bin/bash appuser

# Create data directory for SQLite database and set permissions
RUN mkdir -p /app/data && \
    chown -R appuser:appuser /app/data && \
    chmod 755 /app/data

EXPOSE 8000

# Use entrypoint script to fix permissions at runtime and switch to non-root user
# The entrypoint runs as root to fix permissions, then switches to appuser
ENTRYPOINT ["docker-entrypoint.sh"]

# --proxy-headers: Trust X-Forwarded-* headers from reverse proxy (Docker, nginx, etc.)
# This ensures rate limiting uses the real client IP, not the proxy IP
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
