# Waypoint — Job search, with direction

Waypoint is a full-stack job-search workspace for keeping applications, follow-ups, and interview stages in one calm, useful place. It is designed as a portfolio project: the dashboard is backed by a real REST API and a local SQLite database, rather than demo-only frontend state.

## What it does

- Track opportunities with company, role, location, work style, salary, application date, job link, and notes.
- Move applications between Applied, Screening, Interview, Offer, and Rejected.
- Search and filter the application list.
- See live totals, interview activity, offers, response rate, and a visual pipeline.
- Start with realistic sample applications on first run; remove them and your own records persist in SQLite.
- Explore the API interactively through FastAPI's Swagger UI.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Lucide
- **Backend:** Python 3.11+, FastAPI, Pydantic
- **Storage:** SQLite (no separate database service required)

## Run locally

You need Python 3.11+ and Node.js 20+.

### 1. Start the API

From the project root, in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn main:app --reload --app-dir backend
```

The API runs at <http://localhost:8000>. Interactive API docs: <http://localhost:8000/docs>.

To run the backend tests, install the development requirements and run `python -m pytest backend` from the project root:

```powershell
python -m pip install -r backend\requirements-dev.txt
python -m pytest backend
```

### 2. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. The frontend uses `http://localhost:8000/api` by default. To use another API URL, set `VITE_API_URL` in a `frontend/.env` file.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/dashboard` | Pipeline totals and response rate |
| `GET` | `/api/applications` | List; optional `search` and `status` filters |
| `POST` | `/api/applications` | Create an application |
| `PATCH` | `/api/applications/{id}` | Update application fields |
| `DELETE` | `/api/applications/{id}` | Delete an application |

## Project structure

```text
backend/
  main.py                 FastAPI routes, validation, and SQLite persistence
  requirements.txt
frontend/
  src/
    api.ts                Typed API client
    App.tsx               Dashboard and application workflows
    styles.css            Responsive interface
  package.json
```

## Good next steps

For a production deployment, add authentication and per-user data isolation, move to PostgreSQL, add automated API/UI tests, and configure deployment secrets and CORS origins per environment. This demo intentionally keeps setup simple and stores its SQLite database locally in `backend/opportunity_board.db`.
