"""Clinic opening hours. Single source of truth for seeding, booking rules and availability.

All times are in the clinic's local time zone (settings.TIME_ZONE).
"""

from datetime import date, datetime, time, timedelta

from django.utils import timezone

OPENING_TIME = time(9, 0)
CLOSING_TIME = time(18, 0)
CLOSED_WEEKDAYS = frozenset({6})  # Monday=0 ... Sunday=6
SLOT_INTERVAL = timedelta(minutes=15)

OPENING_HOURS_LABEL = "Monday to Saturday, 09:00-18:00"


def opening_hours(day: date) -> tuple[datetime, datetime] | None:
    """Aware (open, close) datetimes for a given day, or None if the clinic is closed."""
    if day.weekday() in CLOSED_WEEKDAYS:
        return None
    tz = timezone.get_current_timezone()
    return (
        datetime.combine(day, OPENING_TIME, tzinfo=tz),
        datetime.combine(day, CLOSING_TIME, tzinfo=tz),
    )


def is_within_opening_hours(starts_at: datetime, ends_at: datetime) -> bool:
    hours = opening_hours(timezone.localtime(starts_at).date())
    if hours is None:
        return False
    opens, closes = hours
    return opens <= starts_at and ends_at <= closes
