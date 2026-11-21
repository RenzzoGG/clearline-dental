"""Public demo mode: the /api/demo/ endpoint and the nightly `reset_demo` command."""

import pytest
from django.core.management import CommandError, call_command
from rest_framework.test import APIClient

from apps.accounts.demo import DEMO_PATIENT_EMAIL, DEMO_RECEPTIONIST_USERNAME
from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.appointments.models import Appointment
from apps.clinic.models import Patient
from apps.clinic.tests.factories import PatientFactory

pytestmark = pytest.mark.django_db

RECEPTION_PW = "test-only-reception-pw-1"
PATIENT_PW = "test-only-patient-pw-2"


@pytest.fixture
def demo_on(settings):
    settings.DEMO_MODE = True
    settings.DEMO_RECEPTIONIST_PASSWORD = RECEPTION_PW
    settings.DEMO_PATIENT_PASSWORD = PATIENT_PW


def login(username, password):
    return APIClient().post("/api/auth/token/", {"username": username, "password": password})


# --- /api/demo/ -----------------------------------------------------------------------------


def test_demo_endpoint_is_404_when_demo_mode_is_off(settings):
    settings.DEMO_MODE = False
    assert APIClient().get("/api/demo/").status_code == 404


def test_demo_endpoint_is_404_without_passwords(settings):
    settings.DEMO_MODE = True
    settings.DEMO_RECEPTIONIST_PASSWORD = ""
    settings.DEMO_PATIENT_PASSWORD = ""
    assert APIClient().get("/api/demo/").status_code == 404


def test_demo_endpoint_lists_both_accounts(demo_on):
    response = APIClient().get("/api/demo/")
    assert response.status_code == 200
    accounts = {a["role"]: a for a in response.json()["accounts"]}
    assert accounts["receptionist"]["username"] == DEMO_RECEPTIONIST_USERNAME
    assert accounts["receptionist"]["password"] == RECEPTION_PW
    assert accounts["patient"]["username"] == DEMO_PATIENT_EMAIL
    assert accounts["patient"]["password"] == PATIENT_PW


# --- reset_demo -----------------------------------------------------------------------------


def test_reset_demo_requires_demo_mode(settings):
    settings.DEMO_MODE = False
    with pytest.raises(CommandError):
        call_command("reset_demo")


def test_reset_demo_creates_working_demo_accounts(demo_on):
    call_command("reset_demo")

    reception = User.objects.get(username=DEMO_RECEPTIONIST_USERNAME)
    assert reception.role == User.Role.RECEPTIONIST
    assert not reception.is_staff and not reception.is_superuser  # no Django admin
    assert login(DEMO_RECEPTIONIST_USERNAME, RECEPTION_PW).status_code == 200
    assert login(DEMO_PATIENT_EMAIL, PATIENT_PW).status_code == 200


def test_demo_patient_has_a_past_and_an_upcoming_appointment(demo_on):
    call_command("reset_demo")
    patient = Patient.objects.get(email=DEMO_PATIENT_EMAIL)
    statuses = set(Appointment.objects.filter(patient=patient).values_list("status", flat=True))
    assert statuses == {Appointment.Status.COMPLETED, Appointment.Status.PENDING}


def test_reset_demo_removes_visitors_but_keeps_real_staff(demo_on):
    superuser = User.objects.create_superuser("owner", "owner@example.com", "x" * 12)
    staff = UserFactory(role=User.Role.RECEPTIONIST, username="real-front-desk")
    visitor = UserFactory(role=User.Role.PATIENT, username="visitor@example.com")
    PatientFactory(user=visitor, email=visitor.email)

    call_command("reset_demo")

    assert User.objects.filter(pk=superuser.pk).exists()
    assert User.objects.filter(pk=staff.pk).exists()
    assert not User.objects.filter(pk=visitor.pk).exists()
    assert not Patient.objects.filter(email="visitor@example.com").exists()


def test_reset_demo_is_repeatable_and_restores_changed_passwords(demo_on):
    call_command("reset_demo")
    reception = User.objects.get(username=DEMO_RECEPTIONIST_USERNAME)
    reception.set_password("someone-changed-it")
    reception.save()

    call_command("reset_demo")

    assert User.objects.filter(username=DEMO_RECEPTIONIST_USERNAME).count() == 1
    assert User.objects.filter(username=DEMO_PATIENT_EMAIL).count() == 1
    assert login(DEMO_RECEPTIONIST_USERNAME, RECEPTION_PW).status_code == 200


def test_the_api_offers_no_way_to_change_passwords_or_delete_users(demo_on):
    call_command("reset_demo")
    client = APIClient()
    token = login(DEMO_PATIENT_EMAIL, PATIENT_PW).json()["access"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    assert client.patch("/api/auth/me/", {"password": "x"}).status_code == 405
    assert client.delete("/api/auth/me/").status_code == 405
