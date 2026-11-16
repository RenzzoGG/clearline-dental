import pytest
from rest_framework import status

from apps.accounts.tests.factories import UserFactory
from apps.appointments.tests.factories import AppointmentFactory

from .factories import DentistFactory, PatientFactory, ServiceFactory

pytestmark = pytest.mark.django_db

PATIENTS = "/api/patients/"
DENTISTS = "/api/dentists/"
SERVICES = "/api/services/"


# --- access -------------------------------------------------------------------


@pytest.mark.parametrize("url", [PATIENTS, DENTISTS, SERVICES])
def test_anonymous_users_are_rejected(api_client, url):
    assert api_client.get(url).status_code == status.HTTP_403_FORBIDDEN


def test_non_staff_users_are_rejected(api_client):
    api_client.force_authenticate(UserFactory(is_staff=False))

    assert api_client.get(PATIENTS).status_code == status.HTTP_403_FORBIDDEN


# --- patients -----------------------------------------------------------------


def test_create_patient(staff_client):
    payload = {
        "first_name": "Ana",
        "last_name": "Lopez",
        "email": "ana@example.com",
        "phone": "+52 55 1234 5678",
    }

    response = staff_client.post(PATIENTS, payload)

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["full_name"] == "Ana Lopez"
    assert "created_at" in response.data


def test_duplicate_patient_email_returns_400(staff_client):
    PatientFactory(email="ana@example.com")
    payload = {"first_name": "A", "last_name": "B", "email": "ana@example.com", "phone": "1"}

    response = staff_client.post(PATIENTS, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "email" in response.data


def test_list_patients_is_paginated(staff_client):
    PatientFactory.create_batch(25)

    response = staff_client.get(PATIENTS)

    assert response.data["count"] == 25
    assert len(response.data["results"]) == 20
    assert response.data["next"] is not None


def test_page_size_query_param(staff_client):
    PatientFactory.create_batch(5)

    response = staff_client.get(PATIENTS, {"page_size": 2})

    assert len(response.data["results"]) == 2


def test_search_patients(staff_client):
    PatientFactory(last_name="Zamora")
    PatientFactory(last_name="Smith")

    response = staff_client.get(PATIENTS, {"search": "zamo"})

    assert [p["last_name"] for p in response.data["results"]] == ["Zamora"]


def test_update_patient(staff_client):
    patient = PatientFactory(phone="111")

    response = staff_client.patch(f"{PATIENTS}{patient.pk}/", {"phone": "222"})

    assert response.status_code == status.HTTP_200_OK
    patient.refresh_from_db()
    assert patient.phone == "222"


def test_delete_patient_without_appointments(staff_client):
    patient = PatientFactory()

    response = staff_client.delete(f"{PATIENTS}{patient.pk}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_delete_patient_with_appointments_returns_409(staff_client):
    appointment = AppointmentFactory()

    response = staff_client.delete(f"{PATIENTS}{appointment.patient.pk}/")

    assert response.status_code == status.HTTP_409_CONFLICT
    assert "cannot be deleted" in response.data["detail"]


# --- dentists & services ------------------------------------------------------


def test_filter_dentists_by_active(staff_client):
    DentistFactory(is_active=True)
    DentistFactory(is_active=False)

    response = staff_client.get(DENTISTS, {"is_active": "true"})

    assert response.data["count"] == 1
    assert response.data["results"][0]["is_active"] is True


def test_service_duration_validation(staff_client):
    payload = {"name": "Quick", "duration_minutes": 2, "price": "10.00"}

    response = staff_client.post(SERVICES, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "duration_minutes" in response.data


def test_service_price_is_serialized_as_string(staff_client):
    ServiceFactory(price="99.50")

    response = staff_client.get(SERVICES)

    # Decimals are strings in JSON to avoid float rounding on the client.
    assert response.data["results"][0]["price"] == "99.50"
