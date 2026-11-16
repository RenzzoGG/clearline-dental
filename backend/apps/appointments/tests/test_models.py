import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.appointments.models import OVERLAP_ERROR, Appointment
from apps.clinic.tests.factories import DentistFactory, PatientFactory, ServiceFactory

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

Status = Appointment.Status


@pytest.fixture
def dentist():
    return DentistFactory()


@pytest.fixture
def service():
    return ServiceFactory(duration_minutes=30)


def build(dentist, service, starts_at, **kwargs):
    """Unsaved appointment, so tests can run full_clean() before saving."""
    return AppointmentFactory.build(
        dentist=dentist,
        service=service,
        patient=PatientFactory(),
        starts_at=starts_at,
        **kwargs,
    )


# --- ends_at ------------------------------------------------------------------


def test_ends_at_is_computed_from_service_duration():
    appointment = AppointmentFactory(starts_at=at(9), service__duration_minutes=45)

    assert appointment.ends_at == at(9, 45)


def test_ends_at_is_recomputed_when_start_changes():
    appointment = AppointmentFactory(starts_at=at(9), service__duration_minutes=30)

    appointment.starts_at = at(11)
    appointment.save()

    assert appointment.ends_at == at(11, 30)


# --- layer 1: clean() ---------------------------------------------------------


def test_overlapping_appointment_fails_validation(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))
    overlapping = build(dentist, service, at(9, 15))

    with pytest.raises(ValidationError) as exc:
        overlapping.full_clean()

    assert OVERLAP_ERROR in exc.value.messages


def test_appointment_containing_another_fails_validation(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9, 15))
    long_service = ServiceFactory(duration_minutes=90)
    containing = build(dentist, long_service, at(9))

    with pytest.raises(ValidationError):
        containing.full_clean()


def test_back_to_back_appointments_are_allowed(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))
    next_one = build(dentist, service, at(9, 30))

    next_one.full_clean()


def test_same_time_with_another_dentist_is_allowed(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))
    other = build(DentistFactory(), service, at(9))

    other.full_clean()


def test_same_time_on_another_day_is_allowed(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))
    other_day = build(dentist, service, at(9, day=11))

    other_day.full_clean()


def test_cancelled_appointments_do_not_block_the_slot(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9), status=Status.CANCELLED)
    replacement = build(dentist, service, at(9))

    replacement.full_clean()


def test_cancelling_an_overlapping_appointment_is_allowed(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))
    cancelled = build(dentist, service, at(9), status=Status.CANCELLED)

    cancelled.full_clean()


def test_editing_an_appointment_does_not_conflict_with_itself(dentist, service):
    appointment = AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))
    appointment.notes = "Patient prefers mornings"

    appointment.full_clean()


# --- layer 2: database constraints --------------------------------------------


def test_database_rejects_overlap_even_without_clean(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))

    # objects.create() skips clean(): simulates two requests racing past validation.
    with pytest.raises(IntegrityError), transaction.atomic():
        AppointmentFactory(dentist=dentist, service=service, starts_at=at(9, 15))


def test_database_ignores_cancelled_appointments_in_overlap_check(dentist, service):
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9), status=Status.CANCELLED)

    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))

    assert Appointment.objects.filter(dentist=dentist).count() == 2


def test_database_rejects_reactivating_a_conflicting_cancelled_appointment(dentist, service):
    cancelled = AppointmentFactory(
        dentist=dentist, service=service, starts_at=at(9), status=Status.CANCELLED
    )
    AppointmentFactory(dentist=dentist, service=service, starts_at=at(9))

    with pytest.raises(IntegrityError), transaction.atomic():
        Appointment.objects.filter(pk=cancelled.pk).update(status=Status.PENDING)


def test_database_rejects_end_before_start():
    appointment = AppointmentFactory(starts_at=at(9))

    with pytest.raises(IntegrityError), transaction.atomic():
        Appointment.objects.filter(pk=appointment.pk).update(ends_at=at(8))
