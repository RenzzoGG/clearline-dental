from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError

from apps.appointments.tests.factories import AppointmentFactory

from .factories import DentistFactory, PatientFactory, ServiceFactory

pytestmark = pytest.mark.django_db


def test_string_representations():
    patient = PatientFactory(first_name="Ana", last_name="Lopez")
    dentist = DentistFactory(first_name="Sofia", last_name="Ramirez")
    service = ServiceFactory(name="Cleaning", duration_minutes=30)

    assert str(patient) == "Ana Lopez"
    assert str(dentist) == "Dr. Sofia Ramirez"
    assert str(service) == "Cleaning (30 min)"


def test_patient_email_is_unique():
    PatientFactory(email="ana@example.com")

    with pytest.raises(IntegrityError):
        PatientFactory(email="ana@example.com")


@pytest.mark.parametrize("minutes", [0, 4, 481])
def test_service_duration_out_of_range_fails_validation(minutes):
    service = ServiceFactory.build(duration_minutes=minutes)

    with pytest.raises(ValidationError) as exc:
        service.full_clean()

    assert "duration_minutes" in exc.value.message_dict


def test_service_duration_is_also_enforced_by_the_database():
    service = ServiceFactory()

    with pytest.raises(IntegrityError), transaction.atomic():
        type(service).objects.filter(pk=service.pk).update(duration_minutes=0)


def test_service_negative_price_is_rejected_by_the_database():
    with pytest.raises(IntegrityError), transaction.atomic():
        ServiceFactory(price=Decimal("-1.00"))


def test_cannot_delete_dentist_with_appointments():
    appointment = AppointmentFactory()

    with pytest.raises(ProtectedError):
        appointment.dentist.delete()
