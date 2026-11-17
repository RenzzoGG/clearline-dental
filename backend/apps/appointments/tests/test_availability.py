from datetime import date

import pytest
from rest_framework import status

from apps.appointments.availability import available_slots
from apps.appointments.models import Appointment
from apps.clinic.tests.factories import DentistFactory, ServiceFactory

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

MONDAY = date(2030, 6, 10)
SUNDAY = date(2030, 6, 9)
URL = "/api/availability/"


@pytest.fixture
def dentist():
    return DentistFactory()


@pytest.fixture
def service():
    return ServiceFactory(duration_minutes=30)


def starts(slots):
    return [s.starts_at for s in slots]


# --- available_slots() --------------------------------------------------------


def test_empty_day_offers_every_15_minutes_until_the_service_fits(dentist, service):
    slots = available_slots(dentist, service, MONDAY, now=at(0))

    # 09:00 ... 17:30 (a 30 min service must end by 18:00) -> 35 slots.
    assert len(slots) == 35
    assert slots[0].starts_at == at(9)
    assert slots[-1].starts_at == at(17, 30)
    assert slots[-1].ends_at == at(18)


def test_longer_service_has_fewer_slots(dentist):
    slots = available_slots(dentist, ServiceFactory(duration_minutes=90), MONDAY, now=at(0))

    assert slots[-1].starts_at == at(16, 30)


def test_booked_time_is_excluded(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(10))  # 10:00-10:30

    result = starts(available_slots(dentist, service, MONDAY, now=at(0)))

    assert at(9, 30) in result  # ends exactly when the booking starts
    assert at(9, 45) not in result
    assert at(10) not in result
    assert at(10, 15) not in result
    assert at(10, 30) in result  # starts exactly when the booking ends


def test_cancelled_appointments_free_the_slot(dentist, service):
    AppointmentFactory(
        dentist=dentist, service=service, starts_at=at(10), status=Appointment.Status.CANCELLED
    )

    assert at(10) in starts(available_slots(dentist, service, MONDAY, now=at(0)))


def test_other_dentists_bookings_do_not_matter(dentist, service):
    AppointmentFactory(service=service, starts_at=at(10))

    assert at(10) in starts(available_slots(dentist, service, MONDAY, now=at(0)))


def test_past_slots_are_excluded(dentist, service):
    result = starts(available_slots(dentist, service, MONDAY, now=at(12)))

    assert result[0] == at(12, 15)


def test_closed_day_has_no_slots(dentist, service):
    assert available_slots(dentist, service, SUNDAY, now=at(0)) == []


# --- endpoint -----------------------------------------------------------------


def test_availability_endpoint_is_public(api_client, dentist, service):
    response = api_client.get(
        URL, {"dentist": dentist.pk, "service": service.pk, "date": "2030-06-10"}
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.data["duration_minutes"] == 30
    assert response.data["slots"][0] == {
        "starts_at": at(9).isoformat(),
        "ends_at": at(9, 30).isoformat(),
    }


def test_availability_requires_all_params(api_client):
    response = api_client.get(URL)

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert set(response.data) == {"dentist", "service", "date"}


def test_availability_rejects_inactive_dentist(api_client, service):
    inactive = DentistFactory(is_active=False)

    response = api_client.get(
        URL, {"dentist": inactive.pk, "service": service.pk, "date": "2030-06-10"}
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "dentist" in response.data
