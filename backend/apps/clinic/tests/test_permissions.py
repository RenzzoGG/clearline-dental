import pytest
from rest_framework import status

from .factories import DentistFactory, PatientFactory, ServiceFactory

pytestmark = pytest.mark.django_db

PATIENTS = "/api/patients/"
DENTISTS = "/api/dentists/"
SERVICES = "/api/services/"
NEW_DENTIST = {"first_name": "New", "last_name": "Doc", "email": "new@clearline.example"}
NEW_SERVICE = {"name": "Sealant", "duration_minutes": 30, "price": "45.00"}


# --- public catalog ------------------------------------------------------------


@pytest.mark.parametrize(
    ("url", "factory"), [(DENTISTS, DentistFactory), (SERVICES, ServiceFactory)]
)
def test_public_catalog_shows_only_active_records(api_client, url, factory):
    active = factory(is_active=True)
    inactive = factory(is_active=False)

    list_response = api_client.get(url)
    detail_response = api_client.get(f"{url}{inactive.pk}/")

    assert [r["id"] for r in list_response.data["results"]] == [active.pk]
    assert detail_response.status_code == status.HTTP_404_NOT_FOUND


def test_staff_also_sees_inactive_records(staff_client):
    DentistFactory(is_active=True)
    DentistFactory(is_active=False)

    assert staff_client.get(DENTISTS).data["count"] == 2


# --- writes ----------------------------------------------------------------------


@pytest.mark.parametrize(("url", "payload"), [(DENTISTS, NEW_DENTIST), (SERVICES, NEW_SERVICE)])
def test_anonymous_cannot_write_catalog(api_client, url, payload):
    assert api_client.post(url, payload).status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.parametrize(("url", "payload"), [(DENTISTS, NEW_DENTIST), (SERVICES, NEW_SERVICE)])
def test_receptionist_cannot_write_catalog(staff_client, url, payload):
    assert staff_client.post(url, payload).status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.parametrize(("url", "payload"), [(DENTISTS, NEW_DENTIST), (SERVICES, NEW_SERVICE)])
def test_admin_can_write_catalog(clinic_admin_client, url, payload):
    assert clinic_admin_client.post(url, payload).status_code == status.HTTP_201_CREATED


# --- patient records ---------------------------------------------------------------


def test_patients_cannot_browse_patient_records(patient_client):
    assert patient_client.get(PATIENTS).status_code == status.HTTP_403_FORBIDDEN


def test_receptionist_manages_patient_records(staff_client):
    patient = PatientFactory()

    assert staff_client.get(PATIENTS).status_code == status.HTTP_200_OK
    assert staff_client.patch(f"{PATIENTS}{patient.pk}/", {"phone": "1"}).status_code == 200
