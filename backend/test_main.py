import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DATABASE_PATH", tmp_path / "test.db")
    with TestClient(main.app) as test_client:
        yield test_client


def test_dashboard_starts_with_sample_pipeline(client):
    response = client.get("/api/dashboard")

    assert response.status_code == 200
    assert response.json() == {
        "total": 5,
        "interviews": 2,
        "offers": 0,
        "response_rate": 60,
        "stage_counts": {
            "Applied": 2,
            "Screening": 1,
            "Interview": 1,
            "Offer": 0,
            "Rejected": 1,
        },
    }


def test_application_lifecycle_and_filters(client):
    created = client.post(
        "/api/applications",
        json={
            "company": "Acme",
            "role": "Full-stack Engineer",
            "location": "Remote",
            "work_mode": "Remote",
            "status": "Applied",
            "applied_on": "2026-10-24",
        },
    )
    assert created.status_code == 201
    application_id = created.json()["id"]

    filtered = client.get(
        "/api/applications", params={"search": "Acme", "status": "Applied"}
    )
    assert [application["id"] for application in filtered.json()] == [application_id]

    updated = client.patch(
        f"/api/applications/{application_id}", json={"status": "Interview"}
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "Interview"

    deleted = client.delete(f"/api/applications/{application_id}")
    assert deleted.status_code == 204
    assert client.delete(f"/api/applications/{application_id}").status_code == 404


def test_invalid_application_and_empty_patch_are_rejected(client):
    invalid = client.post("/api/applications", json={"company": "", "role": "Engineer"})
    assert invalid.status_code == 422

    empty_patch = client.patch("/api/applications/1", json={})
    assert empty_patch.status_code == 422


def test_deleting_all_examples_does_not_reseed_on_restart(client):
    for application in client.get("/api/applications").json():
        assert client.delete(f"/api/applications/{application['id']}").status_code == 204

    main.initialize_database()

    assert client.get("/api/applications").json() == []
