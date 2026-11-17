import pytest
from rest_framework import status

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.appointments.models import Appointment
from apps.clinic.tests.factories import DentistFactory, PatientFactory, ServiceFactory

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

URL = "/api/appointments/"
Status = Appointment.Status


def detail(appointment, suffix=""):
    return f"{URL}{appointment.pk}/{suffix}"


@pytest.fixture
def own(patient_user):
    return AppointmentFactory(patient=patient_user.patient_profile, starts_at=at(9))


@pytest.fixture
def someone_elses():
    return AppointmentFactory(starts_at=at(11))


# --- patients: row-level access -----------------------------------------------


def test_patient_lists_only_own_appointments(patient_client, own, someone_elses):
    response = patient_client.get(URL)

    assert [a["id"] for a in response.data["results"]] == [own.pk]


def test_patient_gets_404_for_someone_elses_appointment(patient_client, someone_elses):
    # 404, not 403: the API does not even reveal that the appointment exists.
    response = patient_client.get(detail(someone_elses))

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_patient_can_view_own_appointment(patient_client, own):
    assert patient_client.get(detail(own)).status_code == status.HTTP_200_OK


def test_patient_books_for_themselves_even_if_another_patient_is_sent(patient_client, patient_user):
    other = PatientFactory()
    payload = {
        "patient": other.pk,  # ignored: read-only for patients
        "dentist": DentistFactory().pk,
        "service": ServiceFactory().pk,
        "starts_at": at(10).isoformat(),
    }

    response = patient_client.post(URL, payload)

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["patient"] == patient_user.patient_profile.pk
    assert not other.appointments.exists()


def test_patient_booking_follows_booking_rules(patient_client):
    payload = {
        "dentist": DentistFactory().pk,
        "service": ServiceFactory().pk,
        "starts_at": at(7).isoformat(),  # before opening
    }

    response = patient_client.post(URL, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_patient_can_cancel_own_appointment(patient_client, own):
    response = patient_client.post(detail(own, "cancel/"))

    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == Status.CANCELLED


def test_patient_cannot_cancel_someone_elses_appointment(patient_client, someone_elses):
    response = patient_client.post(detail(someone_elses, "cancel/"))

    assert response.status_code == status.HTTP_404_NOT_FOUND
    someone_elses.refresh_from_db()
    assert someone_elses.status == Status.PENDING


@pytest.mark.parametrize("action", ["confirm/", "complete/"])
def test_patient_cannot_change_status_beyond_cancel(patient_client, own, action):
    assert patient_client.post(detail(own, action)).status_code == status.HTTP_403_FORBIDDEN


def test_patient_cannot_edit_appointments(patient_client, own):
    response = patient_client.patch(detail(own), {"notes": "x"})

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_patient_user_without_patient_record_is_rejected(api_client):
    api_client.force_authenticate(UserFactory(role=User.Role.PATIENT))

    assert api_client.get(URL).status_code == status.HTTP_403_FORBIDDEN


# --- staff ---------------------------------------------------------------------


def test_receptionist_sees_all_appointments(staff_client, own, someone_elses):
    response = staff_client.get(URL)

    assert response.data["count"] == 2


def test_receptionist_books_for_any_patient(staff_client):
    patient = PatientFactory()
    payload = {
        "patient": patient.pk,
        "dentist": DentistFactory().pk,
        "service": ServiceFactory().pk,
        "starts_at": at(10).isoformat(),
    }

    response = staff_client.post(URL, payload)

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["patient"] == patient.pk


def test_receptionist_confirms(staff_client, own):
    assert staff_client.post(detail(own, "confirm/")).status_code == status.HTTP_200_OK
