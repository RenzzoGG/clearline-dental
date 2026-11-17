import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.clinic.models import Patient
from apps.clinic.tests.factories import PatientFactory

from .factories import UserFactory

pytestmark = pytest.mark.django_db

REGISTER = "/api/auth/register/"
TOKEN = "/api/auth/token/"
REFRESH = "/api/auth/token/refresh/"
LOGOUT = "/api/auth/token/blacklist/"
ME = "/api/auth/me/"
PASSWORD = "Sm1le-Brightly-2030"


@pytest.fixture
def registration():
    return {
        "email": "Ana.Lopez@Example.com",
        "password": PASSWORD,
        "first_name": "Ana",
        "last_name": "Lopez",
        "phone": "+52 662 123 4567",
    }


def login(client, username, password=PASSWORD):
    return client.post(TOKEN, {"username": username, "password": password})


# --- registration -------------------------------------------------------------


def test_register_creates_patient_account_and_record(api_client, registration):
    response = api_client.post(REGISTER, registration)

    assert response.status_code == status.HTTP_201_CREATED
    assert "password" not in response.data
    assert response.data["role"] == User.Role.PATIENT
    user = User.objects.get(username="ana.lopez@example.com")  # normalized
    assert user.check_password(PASSWORD)
    assert user.patient_profile.pk == response.data["patient"]
    assert user.patient_profile.phone == "+52 662 123 4567"


def test_registered_patient_can_log_in_with_email(api_client, registration):
    api_client.post(REGISTER, registration)

    response = login(api_client, "ana.lopez@example.com")

    assert response.status_code == status.HTTP_200_OK
    assert {"access", "refresh"} <= set(response.data)


def test_register_rejects_existing_account_email(api_client, registration):
    UserFactory(username="ana.lopez@example.com", email="ana.lopez@example.com")

    response = api_client.post(REGISTER, registration)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "email" in response.data


def test_register_does_not_claim_an_existing_patient_record(api_client, registration):
    # Without email verification, auto-linking would expose someone else's history.
    existing = PatientFactory(email="ana.lopez@example.com")

    response = api_client.post(REGISTER, registration)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "contact the clinic" in str(response.data["email"])
    existing.refresh_from_db()
    assert existing.user is None


@pytest.mark.parametrize("password", ["123", "password123", "ana.lopez@example"])
def test_register_rejects_weak_passwords(api_client, registration, password):
    response = api_client.post(REGISTER, {**registration, "password": password})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data
    assert not User.objects.filter(username="ana.lopez@example.com").exists()


def test_register_is_atomic(api_client, registration, monkeypatch):
    def boom(*args, **kwargs):
        raise RuntimeError("database hiccup")

    monkeypatch.setattr(Patient.objects, "create", boom)

    with pytest.raises(RuntimeError):
        api_client.post(REGISTER, registration)

    assert not User.objects.filter(username="ana.lopez@example.com").exists()


# --- tokens -------------------------------------------------------------------


def test_wrong_password_returns_401(api_client):
    UserFactory(username="desk")

    assert login(api_client, "desk", "nope").status_code == status.HTTP_401_UNAUTHORIZED


def test_access_token_authenticates_api_requests():
    UserFactory(username="desk", password=PASSWORD, role=User.Role.RECEPTIONIST)
    client = APIClient()
    access = login(client, "desk").data["access"]

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    assert client.get("/api/patients/").status_code == status.HTTP_200_OK


def test_refresh_rotates_and_blacklists_the_old_token(api_client):
    UserFactory(username="desk", password=PASSWORD)
    old_refresh = login(api_client, "desk").data["refresh"]

    rotated = api_client.post(REFRESH, {"refresh": old_refresh})
    reused = api_client.post(REFRESH, {"refresh": old_refresh})

    assert rotated.status_code == status.HTTP_200_OK
    assert rotated.data["refresh"] != old_refresh
    assert reused.status_code == status.HTTP_401_UNAUTHORIZED


def test_logout_blacklists_the_refresh_token(api_client):
    UserFactory(username="desk", password=PASSWORD)
    refresh = login(api_client, "desk").data["refresh"]

    logout = api_client.post(LOGOUT, {"refresh": refresh})

    assert logout.status_code == status.HTTP_200_OK
    assert api_client.post(REFRESH, {"refresh": refresh}).status_code == 401


# --- /me ----------------------------------------------------------------------


def test_me_requires_authentication(api_client):
    assert api_client.get(ME).status_code == status.HTTP_401_UNAUTHORIZED


def test_me_for_patient(patient_client, patient_user):
    response = patient_client.get(ME)

    assert response.data["role"] == User.Role.PATIENT
    assert response.data["patient"] == patient_user.patient_profile.pk


def test_me_for_staff(staff_client):
    response = staff_client.get(ME)

    assert response.data["role"] == User.Role.RECEPTIONIST
    assert response.data["patient"] is None
