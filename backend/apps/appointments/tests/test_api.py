from datetime import timedelta
from unittest import mock

import pytest
from django.utils import timezone
from rest_framework import status

from apps.appointments.models import OVERLAP_ERROR, Appointment
from apps.clinic.tests.factories import DentistFactory, PatientFactory, ServiceFactory

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

URL = "/api/appointments/"
Status = Appointment.Status


def detail(appointment, suffix=""):
    return f"{URL}{appointment.pk}/{suffix}"


@pytest.fixture
def dentist():
    return DentistFactory()


@pytest.fixture
def service():
    return ServiceFactory(duration_minutes=30)


@pytest.fixture
def payload(dentist, service):
    return {
        "patient": PatientFactory().pk,
        "dentist": dentist.pk,
        "service": service.pk,
        "starts_at": at(9).isoformat(),
    }


# --- create -------------------------------------------------------------------


def test_anonymous_cannot_list_appointments(api_client):
    assert api_client.get(URL).status_code == status.HTTP_403_FORBIDDEN


def test_create_appointment(staff_client, payload):
    response = staff_client.post(URL, payload)

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == Status.PENDING
    assert response.data["ends_at"] == "2030-06-10T09:30:00-06:00"
    assert response.data["service_name"].startswith("Service")


def test_status_cannot_be_set_on_create(staff_client, payload):
    response = staff_client.post(URL, {**payload, "status": Status.COMPLETED})

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["status"] == Status.PENDING


def test_overlapping_appointment_returns_400(staff_client, payload, dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9, 15))

    response = staff_client.post(URL, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["non_field_errors"] == [OVERLAP_ERROR]


def test_database_race_returns_400_instead_of_500(staff_client, payload, dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))

    # Simulate a concurrent request that passed clean() before the other one was saved.
    with mock.patch.object(Appointment, "overlapping_appointments") as overlapping:
        overlapping.return_value.exists.return_value = False
        response = staff_client.post(URL, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["non_field_errors"] == [OVERLAP_ERROR]


@pytest.mark.parametrize(
    ("starts_at", "reason"),
    [
        (at(8, 45), "before opening"),
        (at(17, 45), "ends after closing"),
        (at(10, day=9), "sunday"),
    ],
)
def test_appointment_outside_opening_hours_returns_400(staff_client, payload, starts_at, reason):
    response = staff_client.post(URL, {**payload, "starts_at": starts_at.isoformat()})

    assert response.status_code == status.HTTP_400_BAD_REQUEST, reason
    assert "opening hours" in str(response.data["starts_at"])


def test_appointment_in_the_past_returns_400(staff_client, payload):
    past = timezone.now() - timedelta(days=1)

    response = staff_client.post(URL, {**payload, "starts_at": past.isoformat()})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "future" in str(response.data["starts_at"])


def test_inactive_dentist_and_service_return_400(staff_client, payload, dentist, service):
    dentist.is_active = False
    dentist.save()
    service.is_active = False
    service.save()

    response = staff_client.post(URL, payload)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert set(response.data) >= {"dentist", "service"}


# --- update / delete ----------------------------------------------------------


def test_reschedule_appointment(staff_client, dentist, service):
    appointment = AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))

    response = staff_client.patch(detail(appointment), {"starts_at": at(11).isoformat()})

    assert response.status_code == status.HTTP_200_OK
    assert response.data["ends_at"] == "2030-06-10T11:30:00-06:00"


def test_editing_notes_of_a_started_appointment_skips_booking_rules(staff_client):
    started = AppointmentFactory(starts_at=timezone.now() - timedelta(minutes=10))

    response = staff_client.patch(detail(started), {"notes": "Arrived late"})

    assert response.status_code == status.HTTP_200_OK


def test_final_appointments_cannot_be_edited(staff_client):
    appointment = AppointmentFactory(status=Status.CANCELLED)

    response = staff_client.patch(detail(appointment), {"notes": "x"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_appointments_cannot_be_deleted(staff_client):
    appointment = AppointmentFactory()

    response = staff_client.delete(detail(appointment))

    assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    assert Appointment.objects.filter(pk=appointment.pk).exists()


# --- list & filters -----------------------------------------------------------


def test_filter_by_dentist_and_status(staff_client, dentist):
    match = AppointmentFactory(dentist=dentist, status=Status.CONFIRMED)
    AppointmentFactory(dentist=dentist, starts_at=at(11), status=Status.PENDING)
    AppointmentFactory(status=Status.CONFIRMED)

    response = staff_client.get(URL, {"dentist": dentist.pk, "status": "confirmed"})

    assert [a["id"] for a in response.data["results"]] == [match.pk]


def test_filter_by_date_range_uses_clinic_local_date(staff_client):
    # 20:00 local on June 10 is already June 11 in UTC; it must count as June 10.
    evening = AppointmentFactory(starts_at=at(20, day=10))
    AppointmentFactory(starts_at=at(9, day=11))

    response = staff_client.get(URL, {"date_from": "2030-06-10", "date_to": "2030-06-10"})

    assert [a["id"] for a in response.data["results"]] == [evening.pk]


def test_list_uses_a_constant_number_of_queries(staff_client, django_assert_num_queries):
    for hour in range(9, 14):
        AppointmentFactory(starts_at=at(hour))

    # 1 count for pagination + 1 select with JOINs (no N+1 per appointment).
    with django_assert_num_queries(2):
        response = staff_client.get(URL)

    assert response.data["count"] == 5


# --- status actions -----------------------------------------------------------


def test_confirm_then_complete(staff_client):
    appointment = AppointmentFactory(starts_at=timezone.now() - timedelta(hours=1))

    confirmed = staff_client.post(detail(appointment, "confirm/"))
    completed = staff_client.post(detail(appointment, "complete/"))

    assert confirmed.data["status"] == Status.CONFIRMED
    assert completed.status_code == status.HTTP_200_OK
    assert completed.data["status"] == Status.COMPLETED


def test_cancel_pending_appointment(staff_client):
    appointment = AppointmentFactory()

    response = staff_client.post(detail(appointment, "cancel/"))

    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == Status.CANCELLED


@pytest.mark.parametrize(
    ("initial", "action"),
    [
        (Status.PENDING, "complete/"),
        (Status.CANCELLED, "confirm/"),
        (Status.COMPLETED, "cancel/"),
    ],
)
def test_invalid_transitions_return_409(staff_client, initial, action):
    appointment = AppointmentFactory(status=initial)

    response = staff_client.post(detail(appointment, action))

    assert response.status_code == status.HTTP_409_CONFLICT
    appointment.refresh_from_db()
    assert appointment.status == initial


def test_cannot_complete_a_future_appointment(staff_client):
    appointment = AppointmentFactory(status=Status.CONFIRMED)  # 2030

    response = staff_client.post(detail(appointment, "complete/"))

    assert response.status_code == status.HTTP_409_CONFLICT
    assert "before it starts" in response.data["detail"]
