import pytest
from django.core.management import call_command

from apps.appointments.models import Appointment
from apps.clinic.models import Dentist, Patient, Service

pytestmark = pytest.mark.django_db


def test_seed_creates_demo_data_without_overlaps():
    call_command("seed")

    assert Dentist.objects.count() == 4
    assert Service.objects.count() == 6
    assert Patient.objects.count() == 40
    assert Appointment.objects.exists()
    active = Appointment.objects.exclude(status=Appointment.Status.CANCELLED)
    assert not any(a.overlapping_appointments().exists() for a in active)


def test_seed_does_nothing_when_data_exists(capsys):
    call_command("seed")
    total = Appointment.objects.count()

    call_command("seed")

    assert Appointment.objects.count() == total
    assert "already exists" in capsys.readouterr().out


def test_seed_reset_recreates_the_same_data():
    call_command("seed")
    total = Appointment.objects.count()

    call_command("seed", "--reset")

    assert Dentist.objects.count() == 4
    assert Appointment.objects.count() == total
