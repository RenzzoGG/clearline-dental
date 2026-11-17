from datetime import date

import pytest
from rest_framework import status

from apps.appointments.models import Appointment
from apps.clinic.tests.factories import ServiceFactory

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

URL = "/api/stats/"
RANGE = {"date_from": "2030-06-10", "date_to": "2030-06-12"}
Status = Appointment.Status


@pytest.fixture
def week():
    cleaning = ServiceFactory(name="Cleaning")
    filling = ServiceFactory(name="Filling")
    AppointmentFactory(service=cleaning, starts_at=at(9, day=10), status=Status.COMPLETED)
    AppointmentFactory(service=cleaning, starts_at=at(10, day=10), status=Status.CONFIRMED)
    # 20:00 local on June 10 is June 11 in UTC: must still count for June 10.
    AppointmentFactory(service=filling, starts_at=at(20, day=10), status=Status.PENDING)
    AppointmentFactory(service=filling, starts_at=at(9, day=12), status=Status.CANCELLED)
    AppointmentFactory(service=filling, starts_at=at(9, day=13))  # outside the range


def test_stats(staff_client, week):
    response = staff_client.get(URL, RANGE)

    assert response.status_code == status.HTTP_200_OK
    data = response.data
    assert data["total"] == 4
    assert data["by_status"] == {"pending": 1, "confirmed": 1, "completed": 1, "cancelled": 1}
    assert data["cancellation_rate"] == 0.25
    assert [(d["date"], d["count"]) for d in data["by_day"]] == [
        ("2030-06-10", 3),
        ("2030-06-11", 0),  # zero-filled
        ("2030-06-12", 0),  # only a cancelled one
    ]
    assert data["by_service"] == [
        {"service": "Cleaning", "count": 2},
        {"service": "Filling", "count": 1},
    ]


def test_stats_empty_range(staff_client):
    response = staff_client.get(URL, RANGE)

    assert response.data["total"] == 0
    assert response.data["cancellation_rate"] == 0.0


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"date_from": "2030-06-12", "date_to": "2030-06-10"},
        {"date_from": "2030-01-01", "date_to": "2031-06-01"},
    ],
)
def test_stats_validates_range(staff_client, params):
    assert staff_client.get(URL, params).status_code == status.HTTP_400_BAD_REQUEST


def test_stats_is_staff_only(api_client, patient_client):
    assert api_client.get(URL, RANGE).status_code == status.HTTP_401_UNAUTHORIZED
    assert patient_client.get(URL, RANGE).status_code == status.HTTP_403_FORBIDDEN


def test_stats_uses_constant_queries(staff_client, week, django_assert_max_num_queries):
    with django_assert_max_num_queries(4):
        staff_client.get(URL, {"date_from": "2030-06-01", "date_to": date(2030, 6, 30)})
