"""Free time slots for a dentist and service on a given day."""

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from django.utils import timezone

from apps.clinic.models import Dentist, Service

from .models import Appointment
from .schedule import SLOT_INTERVAL, opening_hours


@dataclass(frozen=True)
class Slot:
    starts_at: datetime
    ends_at: datetime


def available_slots(
    dentist: Dentist, service: Service, day: date, *, now: datetime | None = None
) -> list[Slot]:
    """Every SLOT_INTERVAL start time within opening hours where the service fits
    without overlapping an active appointment of the dentist and is not in the past."""
    hours = opening_hours(day)
    if hours is None:
        return []
    opens, closes = hours
    now = now or timezone.now()
    duration = timedelta(minutes=service.duration_minutes)

    # One query for the whole day; overlap checks happen in memory.
    busy = list(
        Appointment.objects.filter(dentist=dentist, starts_at__lt=closes, ends_at__gt=opens)
        .exclude(status=Appointment.Status.CANCELLED)
        .values_list("starts_at", "ends_at")
    )

    slots = []
    start = opens
    while start + duration <= closes:
        end = start + duration
        is_free = all(not (start < busy_end and end > busy_start) for busy_start, busy_end in busy)
        if start > now and is_free:
            slots.append(Slot(starts_at=start, ends_at=end))
        start += SLOT_INTERVAL
    return slots
