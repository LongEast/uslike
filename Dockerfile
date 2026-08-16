# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS frontend-build

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Keep API requests same-origin by default. A public, separately hosted API can be
# selected at image build time with --build-arg VITE_API_BASE_URL=https://api.example.com.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build


FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8000 \
    USLIKE_FRONTEND_DIST_PATH=/app/dist \
    USLIKE_UPLOADS_PATH=/var/lib/uslike/uploads

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --requirement /tmp/requirements.txt \
    && rm /tmp/requirements.txt \
    && groupadd --gid 10001 uslike \
    && useradd --uid 10001 --gid uslike --home-dir /app --no-create-home \
        --shell /usr/sbin/nologin uslike \
    && mkdir -p /var/lib/uslike/uploads \
    && chown -R uslike:uslike /app /var/lib/uslike

COPY --chown=uslike:uslike backend ./backend
COPY --chown=uslike:uslike alembic.ini ./alembic.ini
COPY --from=frontend-build --chown=uslike:uslike /build/dist ./dist
COPY --chown=uslike:uslike scripts/entrypoint.sh ./scripts/entrypoint.sh

RUN chmod 0755 /app/scripts/entrypoint.sh

USER 10001:10001

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/api/health', timeout=3)" || exit 1

ENTRYPOINT ["/app/scripts/entrypoint.sh"]
