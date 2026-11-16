import pytest

from apps.appointments.models import Appointment, InvalidTransition

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

Status = Appointment.Status


@pytest.mark.parametrize(
    ("initial", "target"),
    [
        (Status.PENDING, Status.CONFIRMED),
        (Status.PENDING, Status.CANCELLED),
        (Status.CONFIRMED, Status.COMPLETED),
        (Status.CONFIRMED, Status.CANCELLED),
    ],
)
def test_allowed_transitions(initial, target):
    appointment = AppointmentFactory(status=initial, starts_at=at(9))

    appointment.transition_to(target, now=at(10))

    appointment.refresh_from_db()
    assert appointment.status == target


@pytest.mark.parametrize(
    ("initial", "target"),
    [
        (Status.PENDING, Status.COMPLETED),
        (Status.CONFIRMED, Status.PENDING),
        (Status.COMPLETED, Status.CANCELLED),
        (Status.CANCELLED, Status.PENDING),
        (Status.CANCELLED, Status.CONFIRMED),
    ],
)
def test_forbidden_transitions(initial, target):
    appointment = AppointmentFactory(status=initial, starts_at=at(9))

    with pytest.raises(InvalidTransition):
        appointment.transition_to(target, now=at(10))


def test_cannot_complete_before_start():
    appointment = AppointmentFactory(status=Status.CONFIRMED, starts_at=at(9))

    with pytest.raises(InvalidTransition, match="before it starts"):
        appointment.transition_to(Status.COMPLETED, now=at(8))


@pytest.mark.parametrize("final", [Status.COMPLETED, Status.CANCELLED])
def test_final_states(final):
    assert AppointmentFactory.build(status=final).is_final
