"""Production behaviour: rate limiting, and serving the built frontend (SPA)."""

import pytest
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from config import spa

pytestmark = pytest.mark.django_db

TOKEN = "/api/auth/token/"
REGISTER = "/api/auth/register/"
APPOINTMENTS = "/api/appointments/"


@pytest.fixture
def tight_rates(monkeypatch):
    """Small limits so tests stay fast (counts live in the DB cache, rolled back per test)."""
    for scope in ("auth_login", "auth_register", "auth_refresh", "booking", "availability"):
        monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, scope, "2/hour")


# --- throttling ---------------------------------------------------------------------------


def test_login_is_rate_limited_per_client(tight_rates):
    client = APIClient()
    credentials = {"username": "x", "password": "y"}
    statuses = [client.post(TOKEN, credentials).status_code for _ in range(3)]
    assert statuses == [401, 401, 429]


def test_login_limit_uses_the_real_rate_by_default():
    # 10/min as configured: the 11th attempt in a minute is refused.
    client = APIClient()
    statuses = [
        client.post(TOKEN, {"username": "x", "password": "y"}).status_code for _ in range(11)
    ]
    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429


def test_register_is_rate_limited(tight_rates):
    client = APIClient()
    statuses = [client.post(REGISTER, {}).status_code for _ in range(3)]
    assert statuses == [400, 400, 429]


def test_throttled_response_says_when_to_retry(tight_rates):
    client = APIClient()
    for _ in range(2):
        client.post(TOKEN, {"username": "x", "password": "y"})
    response = client.post(TOKEN, {"username": "x", "password": "y"})
    assert response.status_code == 429
    assert int(response["Retry-After"]) > 0


def test_patient_booking_is_rate_limited(tight_rates, patient_client):
    statuses = [patient_client.post(APPOINTMENTS, {}).status_code for _ in range(3)]
    assert statuses == [400, 400, 429]


def test_front_desk_booking_is_not_rate_limited(tight_rates, staff_client):
    statuses = [staff_client.post(APPOINTMENTS, {}).status_code for _ in range(4)]
    assert 429 not in statuses


def test_limits_are_per_client_ip(tight_rates, settings):
    first, second = APIClient(REMOTE_ADDR="10.0.0.1"), APIClient(REMOTE_ADDR="10.0.0.2")
    for _ in range(2):
        first.post(TOKEN, {"username": "x", "password": "y"})
    assert first.post(TOKEN, {"username": "x", "password": "y"}).status_code == 429
    assert second.post(TOKEN, {"username": "x", "password": "y"}).status_code == 401


# --- single-page app ----------------------------------------------------------------------


@pytest.fixture
def frontend_build(tmp_path, settings):
    (tmp_path / "index.html").write_text("<!doctype html><title>Clearline app</title>")
    settings.FRONTEND_DIST = tmp_path
    spa._index_html.cache_clear()
    yield tmp_path
    spa._index_html.cache_clear()


@pytest.mark.parametrize("path", ["/", "/book", "/login", "/dashboard", "/dashboard/insights"])
def test_app_routes_serve_index_html(client, frontend_build, path):
    response = client.get(path)
    assert response.status_code == 200
    assert b"Clearline app" in response.content
    assert response["Cache-Control"] == "no-cache"


@pytest.mark.parametrize("path", ["/", "/book"])
def test_app_routes_answer_head(client, frontend_build, path):
    response = client.head(path)
    assert response.status_code == 200
    assert response["Cache-Control"] == "no-cache"


def test_app_routes_reject_post(client, frontend_build):
    assert client.post("/book").status_code == 405


@pytest.mark.parametrize(
    "path",
    [
        "/api/does-not-exist/",
        "/assets/missing-abc123.js",
        "/img/missing.avif",
        "/favicon.ico",
        "/favicon.ico/",
    ],
)
def test_missing_api_and_asset_paths_are_real_404s(client, frontend_build, path):
    response = client.get(path)
    assert response.status_code == 404
    assert b"Clearline app" not in response.content


def test_admin_without_slash_still_redirects_to_admin(client, frontend_build):
    response = client.get("/admin")
    assert response.status_code == 301
    assert response["Location"] == "/admin/"


def test_without_a_frontend_build_app_routes_are_404(client, settings, tmp_path):
    settings.FRONTEND_DIST = tmp_path / "missing"
    spa._index_html.cache_clear()
    assert client.get("/book").status_code == 404
    spa._index_html.cache_clear()
