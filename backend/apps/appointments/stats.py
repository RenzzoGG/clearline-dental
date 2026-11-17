"""Aggregated appointment metrics for the clinic dashboard."""

from datetime import date, timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate

from .models import Appointment


def appointment_stats(date_from: date, date_to: date) -> dict:
    """Counts per status, per local day (zero-filled) and per service, plus cancellation rate.

    Days are the clinic's local dates. "by_day" and "by_service" exclude cancellations.
    """
    in_range = Appointment.objects.filter(
        starts_at__date__gte=date_from, starts_at__date__lte=date_to
    )
    by_status = dict(in_range.values_list("status").annotate(n=Count("id")))
    total = sum(by_status.values())
    cancelled = by_status.get(Appointment.Status.CANCELLED, 0)
    active = in_range.exclude(status=Appointment.Status.CANCELLED)

    per_day = dict(
        active.annotate(day=TruncDate("starts_at")).values_list("day").annotate(n=Count("id"))
    )
    days = (date_to - date_from).days + 1
    by_day = [
        {"date": day, "count": per_day.get(day, 0)}
        for day in (date_from + timedelta(days=offset) for offset in range(days))
    ]

    by_service = [
        {"service": name, "count": n}
        for name, n in active.values_list("service__name")
        .annotate(n=Count("id"))
        .order_by("-n", "service__name")
    ]

    return {
        "date_from": date_from,
        "date_to": date_to,
        "total": total,
        "by_status": {status: by_status.get(status, 0) for status in Appointment.Status.values},
        "cancellation_rate": round(cancelled / total, 4) if total else 0.0,
        "by_day": by_day,
        "by_service": by_service,
    }
