import pytest
from django.urls import reverse


@pytest.mark.django_db
def test_openapi_schema_is_public_and_lists_endpoints(client):
    response = client.get(reverse("schema"))

    assert response.status_code == 200
    body = response.content.decode()
    for path in ["/api/appointments/{id}/confirm/", "/api/availability/", "/api/patients/"]:
        assert path in body


@pytest.mark.django_db
def test_swagger_ui_loads(client):
    assert client.get(reverse("docs")).status_code == 200


@pytest.mark.django_db
def test_cors_allows_the_frontend_origin(client):
    response = client.get(reverse("health"), headers={"Origin": "http://localhost:5173"})

    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"


@pytest.mark.django_db
def test_cors_rejects_unknown_origins(client):
    response = client.get(reverse("health"), headers={"Origin": "https://evil.example"})

    assert "Access-Control-Allow-Origin" not in response.headers
