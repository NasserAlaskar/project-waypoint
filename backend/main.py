from contextlib import asynccontextmanager, contextmanager
from datetime import date, timedelta
from enum import StrEnum
from pathlib import Path
import sqlite3
from typing import Annotated, Iterator

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

DATABASE_PATH = Path(__file__).with_name("opportunity_board.db")


class ApplicationStatus(StrEnum):
    APPLIED = "Applied"
    SCREENING = "Screening"
    INTERVIEW = "Interview"
    OFFER = "Offer"
    REJECTED = "Rejected"


class WorkMode(StrEnum):
    REMOTE = "Remote"
    HYBRID = "Hybrid"
    ONSITE = "On-site"


class ApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=100)
    role: str = Field(min_length=1, max_length=120)
    location: str = Field(default="Remote", max_length=100)
    work_mode: WorkMode = WorkMode.REMOTE
    status: ApplicationStatus = ApplicationStatus.APPLIED
    applied_on: date = Field(default_factory=date.today)
    salary: str = Field(default="", max_length=80)
    job_url: str = Field(default="", max_length=500)
    notes: str = Field(default="", max_length=2000)


class ApplicationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company: str | None = Field(default=None, min_length=1, max_length=100)
    role: str | None = Field(default=None, min_length=1, max_length=120)
    location: str | None = Field(default=None, max_length=100)
    work_mode: WorkMode | None = None
    status: ApplicationStatus | None = None
    applied_on: date | None = None
    salary: str | None = Field(default=None, max_length=80)
    job_url: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=2000)


class Application(ApplicationCreate):
    id: int
    created_at: str


class Dashboard(BaseModel):
    total: int
    interviews: int
    offers: int
    response_rate: int
    stage_counts: dict[str, int]


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def database_connection() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize_database() -> None:
    with database_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT NOT NULL,
                role TEXT NOT NULL,
                location TEXT NOT NULL,
                work_mode TEXT NOT NULL,
                status TEXT NOT NULL,
                applied_on TEXT NOT NULL,
                salary TEXT NOT NULL DEFAULT '',
                job_url TEXT NOT NULL DEFAULT '',
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS app_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        already_seeded = connection.execute(
            "SELECT 1 FROM app_metadata WHERE key = 'demo_data_seeded'"
        ).fetchone()
        if not already_seeded:
            today = date.today()
            examples = [
                ("Linear", "Product Engineer", "New York, NY", "Hybrid", "Interview", today - timedelta(days=2), "$145k–$180k", "https://linear.app/careers", "Final round with the product team. Prepare a short walkthrough of a project you shipped."),
                ("Vercel", "Frontend Engineer", "Remote", "Remote", "Screening", today - timedelta(days=5), "$130k–$165k", "https://vercel.com/careers", "Recruiter screen scheduled for Thursday. Review React Server Components."),
                ("Figma", "Software Engineer", "San Francisco, CA", "Hybrid", "Applied", today - timedelta(days=8), "$150k–$190k", "https://www.figma.com/careers/", "Tailor portfolio case study to collaborative product work."),
                ("Notion", "Full-stack Engineer", "Remote", "Remote", "Applied", today - timedelta(days=11), "$140k–$180k", "https://www.notion.so/careers", "Reach out to a second-degree connection."),
                ("Stripe", "Backend Engineer", "Seattle, WA", "Hybrid", "Rejected", today - timedelta(days=18), "$160k–$210k", "https://stripe.com/jobs", "Closed after first round; revisit systems design prep."),
            ]
            connection.executemany(
                """
                INSERT INTO applications
                    (company, role, location, work_mode, status, applied_on, salary, job_url, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (*application[:5], application[5].isoformat(), *application[6:])
                    for application in examples
                ],
            )
            connection.execute(
                "INSERT INTO app_metadata (key, value) VALUES ('demo_data_seeded', 'true')"
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="Opportunity Board API",
    description="A local-first API for managing a focused job search.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/dashboard", response_model=Dashboard)
def get_dashboard() -> Dashboard:
    with database_connection() as connection:
        rows = connection.execute(
            "SELECT status, COUNT(*) AS count FROM applications GROUP BY status"
        ).fetchall()
    counts = {status.value: 0 for status in ApplicationStatus}
    counts.update({row["status"]: row["count"] for row in rows})
    total = sum(counts.values())
    responses = total - counts[ApplicationStatus.APPLIED.value]
    return Dashboard(
        total=total,
        interviews=counts[ApplicationStatus.INTERVIEW.value]
        + counts[ApplicationStatus.SCREENING.value],
        offers=counts[ApplicationStatus.OFFER.value],
        response_rate=round(responses / total * 100) if total else 0,
        stage_counts=counts,
    )


@app.get("/api/applications", response_model=list[Application])
def list_applications(
    search: Annotated[str, Query(max_length=120)] = "",
    status: ApplicationStatus | None = None,
) -> list[Application]:
    clauses: list[str] = []
    values: list[str] = []
    if search.strip():
        clauses.append("(company LIKE ? OR role LIKE ? OR location LIKE ?)")
        term = f"%{search.strip()}%"
        values.extend([term, term, term])
    if status:
        clauses.append("status = ?")
        values.append(status.value)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with database_connection() as connection:
        rows = connection.execute(
            f"SELECT * FROM applications {where} ORDER BY applied_on DESC, id DESC",
            values,
        ).fetchall()
    return [Application.model_validate(dict(row)) for row in rows]


@app.post("/api/applications", response_model=Application, status_code=201)
def create_application(application: ApplicationCreate) -> Application:
    values = application.model_dump(mode="json")
    with database_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO applications
                (company, role, location, work_mode, status, applied_on, salary, job_url, notes)
            VALUES (:company, :role, :location, :work_mode, :status, :applied_on, :salary, :job_url, :notes)
            """,
            values,
        )
        row = connection.execute(
            "SELECT * FROM applications WHERE id = ?", (cursor.lastrowid,)
        ).fetchone()
    return Application.model_validate(dict(row))


@app.patch("/api/applications/{application_id}", response_model=Application)
def update_application(
    application_id: int, update: ApplicationUpdate
) -> Application:
    changes = update.model_dump(
        mode="json", exclude_unset=True, exclude_none=True
    )
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one field to update.")
    assignments = ", ".join(f"{field} = :{field}" for field in changes)
    changes["id"] = application_id
    with database_connection() as connection:
        cursor = connection.execute(
            f"UPDATE applications SET {assignments} WHERE id = :id", changes
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Application not found.")
        row = connection.execute(
            "SELECT * FROM applications WHERE id = ?", (application_id,)
        ).fetchone()
    return Application.model_validate(dict(row))


@app.delete("/api/applications/{application_id}", status_code=204)
def delete_application(application_id: int) -> Response:
    with database_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM applications WHERE id = ?", (application_id,)
        )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Application not found.")
    return Response(status_code=204)
