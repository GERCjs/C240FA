"""
Flask route tests for the Python web migration.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

try:
    from app import create_app
    import web.routes as routes

    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False

pytestmark = pytest.mark.skipif(not HAS_FLASK, reason="Flask dependencies are not installed")


@pytest.fixture()
def client(monkeypatch):
    app = create_app()
    app.config.update(TESTING=True, SECRET_KEY="test")

    monkeypatch.setattr(routes.db, "fetch_all", lambda *args, **kwargs: [])
    monkeypatch.setattr(routes.db, "fetch_one", lambda *args, **kwargs: None)
    monkeypatch.setattr(routes.db, "insert", lambda *args, **kwargs: 1)
    monkeypatch.setattr(routes.db, "execute", lambda *args, **kwargs: 1)

    return app.test_client()


def test_home_page_renders(client):
    response = client.get("/")
    assert response.status_code == 200
    assert b"Study Buddy AI" in response.data


def test_dashboard_requires_login(client):
    response = client.get("/dashboard")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")


def test_login_page_renders(client):
    response = client.get("/login")
    assert response.status_code == 200
    assert b"Login" in response.data


def test_admin_requires_login(client):
    response = client.get("/admin")
    assert response.status_code == 302
    assert response.headers["Location"].endswith("/login")
