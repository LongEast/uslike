# Uslike MVP

React + Vite + Tailwind CSS frontend with a FastAPI JSON-database authentication backend.

Now in-website user tips are also available

## Requirements

- Node.js 18 or newer
- npm
- Python 3.11 or newer

## Install frontend

```bash
npm install
```

## Install backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements-dev.txt
```

## Run locally

Start the FastAPI server from the repository root:

```bash
.venv/bin/uvicorn backend.app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive Swagger documentation is available at
`http://127.0.0.1:8000/docs`.

Start the Vite development server:

```bash
npm run dev
```

Open the app in your browser:

```text
http://localhost:5173/
```

### Frontend API URL

For local development, `VITE_API_BASE_URL` is intentionally optional. When it is unset,
`import.meta.env.VITE_API_BASE_URL` is `undefined` and the frontend falls back to an empty string.
API requests therefore use relative `/api/...` URLs, which Vite proxies to
`http://127.0.0.1:8000` according to `vite.config.js`.

Set `VITE_API_BASE_URL` only when the frontend must call a separately hosted backend directly.
Create or update `.env.local` in the repository root:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

This also applies when FastAPI uses a different local port. For example:

```bash
.venv/bin/uvicorn backend.app.main:app --reload --port 8001
```

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8001
```

Use the backend origin without a trailing slash. Vite exposes only variables prefixed with
`VITE_` to frontend code. It reads environment files when the development server starts, so stop
and restart `npm run dev` after changing `.env.local`. For a production deployment, provide the
variable before running `npm run build`; the value is embedded in the browser bundle and must not
contain secrets.

The backend creates `backend/data/uslike.json` on the first successful write. The store uses locked,
atomic file replacement, but is intentionally limited to one application process and should not be
used as a production database.

Authentication and onboarding endpoints:

- `POST /api/auth/register` creates the account after the basic profile is complete.
- `POST /api/auth/login` creates a seven-day session.
- `POST /api/auth/logout` revokes the current session.
- `GET /api/account` returns the current account profile and questionnaire summary.
- `PATCH /api/account/profile` updates public profile fields without changing the user UUID.
- `PUT /api/account/phone` and `PUT /api/account/password` require the current password and revoke
  the user's other sessions.
- `POST /api/account/avatar` uploads a JPEG, PNG, or WebP avatar up to 2 MB; `DELETE` on the same
  path restores the generated default avatar. Runtime uploads live under `backend/data/uploads/`.
- `POST /api/profile/values-test` validates and saves the optional post-registration questionnaire
  for the current Bearer Token user. Re-submitting replaces the previous questionnaire response.
- `GET /api/onboarding/{module}` reports whether a module tutorial should still be shown.
- `POST /api/onboarding/{module}/events` records tutorial progress, dismissal, completion, or an
  explicit restart from settings in the generic behavior event log. Interrupted tutorials remain
  unfinished and restart on the next entry.

## Test

```bash
.venv/bin/pytest
npm test
npm run build
```

## Build

Create a production build:

```bash
npm run build
```

The built files will be generated in `dist/`.

## Serve the production app with FastAPI

Build the frontend, then start FastAPI from the repository root:

```bash
npm run build
.venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

FastAPI serves the generated frontend and the API from the same origin. Open
`http://127.0.0.1:8000/mvp/messages`; refreshing a nested route such as
`/mvp/story/ice-civilization` returns the React app, while `/api`, `/docs`, `/redoc`,
`/openapi.json`, and `/api/uploads` remain backend routes.

By default the backend looks for `dist/` at the repository root. Set
`USLIKE_FRONTEND_DIST_PATH` to use a different build directory:

```bash
USLIKE_FRONTEND_DIST_PATH=/srv/uslike/frontend-dist \
  .venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

When the default `dist/` has not been built, FastAPI continues in API-only mode for local backend
development. A missing or invalid explicitly configured directory fails startup with a clear error
instead of silently serving the wrong files.

## Preview Production Build

After building, preview the production output locally:

```bash
npm run preview
```

Then open the URL printed by Vite, usually:

```text
http://localhost:4173/
```

## Production deployment with PostgreSQL

The production container builds the Vite frontend and serves it from FastAPI, so the browser and
API use the same origin by default. The runtime image runs as an unprivileged user, applies all
Alembic migrations before starting the server, listens on the platform-provided `PORT`, and stores
uploads outside the image.

### Run the production stack locally

Docker Compose starts the application, PostgreSQL, and persistent named volumes:

```bash
POSTGRES_PASSWORD='choose-a-local-password' docker compose up --build
```

Open `http://127.0.0.1:8000`. Set `APP_PORT` if port 8000 is already in use:

```bash
APP_PORT=8080 POSTGRES_PASSWORD='choose-a-local-password' docker compose up --build
```

The Compose password default is intended only for local development. Set a strong, unique password
for any shared environment. If the password contains URL-reserved characters, percent-encode it in
`DATABASE_URL` when deploying outside Compose.

### Deploy the container

Build and push `Dockerfile` to any platform that supports OCI containers. Configure a managed
PostgreSQL database and these runtime variables:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL, for example `postgresql://USER:PASSWORD@HOST:5432/DBNAME` |
| `PORT` | Platform-dependent | HTTP port assigned by the platform; defaults to `8000` |
| `USLIKE_UPLOADS_PATH` | No | Mounted persistent upload directory; defaults to `/var/lib/uslike/uploads` |
| `FORWARDED_ALLOW_IPS` | No | Proxy addresses trusted by Uvicorn; defaults to `*` inside the container |

Mount a persistent volume at the value of `USLIKE_UPLOADS_PATH`. Database records live in
PostgreSQL, but uploaded avatars and story images remain files and will be lost on an ephemeral
filesystem. Existing ignored files under `backend/data/` are intentionally excluded from the image;
copy approved uploads to the mounted volume separately if they are needed in production.

The image entrypoint runs the following migration before accepting traffic:

```bash
alembic upgrade head
```

If the migration fails, the server does not start. The platform health-check path is
`/api/health`.

For a separately hosted frontend/API, provide the public API origin while building the image. This
value is embedded into the browser bundle and must not contain secrets:

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --tag uslike:latest .
```
