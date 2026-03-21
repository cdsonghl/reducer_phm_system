# PHM System (Frontend + Django Backend)

This repository now supports **full-stack container deployment** with:
- `phm-frontend`: React + Vite + Nginx
- `phm-backend`: Django + DRF + JWT + Gunicorn + SQLite

## Local frontend development

```bash
npm install
npm run dev
```

Optional frontend env (`.env`):

```bash
VITE_API_BASE_URL=http://localhost:8000/api
VITE_AUTH_BASE_URL=http://localhost:8000
```

## Full-stack Docker run (recommended)

```bash
docker compose up -d --build
```

Open:
- Frontend: `http://localhost:8080`
- API root (via Nginx reverse proxy): `http://localhost:8080/api/`

Default demo account:
- Username: `admin`
- Password: `admin123`

Stop services:

```bash
docker compose down
```

## Deployment notes

- The frontend image is built with `VITE_API_BASE_URL=/api`, so browser requests go through Nginx.
- Nginx proxies `/api/*` to backend container `phm-backend:8000`.
- Backend uses SQLite at `/data/db.sqlite3` (Docker volume `phm_backend_data`).
- For production, update at least:
  - `DJANGO_SECRET_KEY`
  - `DEMO_ADMIN_PASSWORD`
  - `DJANGO_ALLOWED_HOSTS`

## Main Docker files

- `docker-compose.yml`: full-stack orchestration
- `Dockerfile`: frontend multi-stage build
- `nginx.conf`: SPA routing + `/api` reverse proxy
- `phm-backend/Dockerfile`: Django runtime image
- `phm-backend/requirements.txt`: backend dependencies
