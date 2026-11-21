from unittest import mock

import pytest
from django.db import DatabaseError
from django.urls import reverse


@pytest.mark.django_db
def test_health_ok(client):
    response = client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


@pytest.mark.django_db
def test_health_returns_503_when_database_fails(client):
    with mock.patch("apps.core.views.connection.cursor", side_effect=DatabaseError):
        response = client.get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["database"] == "unavailable"


@pytest.mark.django_db
def test_health_answers_head(client):
    # Uptime monitors often probe with HEAD; it must not be a 405.
    response = client.head(reverse("health"))

    assert response.status_code == 200


def test_health_rejects_post(client):
    response = client.post(reverse("health"))

    assert response.status_code == 405
