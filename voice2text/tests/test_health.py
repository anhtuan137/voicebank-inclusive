from fastapi.testclient import TestClient

from voice2text.server import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_info_reports_providers():
    resp = client.get("/info")
    assert resp.status_code == 200
    assert "providers" in resp.json()
