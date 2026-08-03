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

Vite proxies `/api` requests to the local FastAPI server. For a separately hosted backend, set
`VITE_API_BASE_URL` to its origin when building the frontend.

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

## Preview Production Build

After building, preview the production output locally:

```bash
npm run preview
```

Then open the URL printed by Vite, usually:

```text
http://localhost:4173/
```
