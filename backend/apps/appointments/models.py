from datetime import timedelta

from django.contrib.postgres.constraints import ExclusionConstraint
from django.contrib.postgres.fields import DateTimeRangeField, RangeBoundary, RangeOperators
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.clinic.models import Dentist, Patient, Service
from apps.core.models import TimeStampedModel

OVERLAP_ERROR = "This dentist already has an appointment that overlaps with this time."


class TsTzRange(models.Func):
    """SQL ``TSTZRANGE(start, end, '[)')``: a timestamptz range for the exclusion constraint."""

    function = "TSTZRANGE"
    output_field = DateTimeRangeField()


class Appointment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="appointments")
    dentist = models.ForeignKey(Dentist, on_delete=models.PROTECT, related_name="appointments")
    service = models.ForeignKey(Service, on_delete=models.PROTECT, related_name="appointments")
    starts_at = models.DateTimeField()
    # Always derived from starts_at + service duration (see compute_ends_at).
    ends_at = models.DateTimeField(editable=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["starts_at"]),
            models.Index(fields=["status"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")),
                name="appointment_ends_after_start",
            ),
            # Database-level guarantee: no two active appointments for the same dentist
            # may overlap, even if two requests race past clean() at the same time.
            ExclusionConstraint(
                name="appointment_no_dentist_overlap",
                expressions=[
                    (TsTzRange("starts_at", "ends_at", RangeBoundary()), RangeOperators.OVERLAPS),
                    ("dentist", RangeOperators.EQUAL),
                ],
                condition=~models.Q(status="cancelled"),
                violation_error_message=OVERLAP_ERROR,
            ),
        ]

    def __str__(self) -> str:
        # Values loaded from the DB are in UTC; show them in the clinic's local time.
        starts_at = timezone.localtime(self.starts_at)
        return f"{self.patient} with {self.dentist} at {starts_at:%Y-%m-%d %H:%M}"

    def compute_ends_at(self):
        return self.starts_at + timedelta(minutes=self.service.duration_minutes)

    def _sync_ends_at(self) -> None:
        if self.starts_at is not None and self.service_id is not None:
            self.ends_at = self.compute_ends_at()

    def overlapping_appointments(self):
        """Active appointments of the same dentist whose time range intersects this one."""
        return (
            Appointment.objects.filter(
                dentist_id=self.dentist_id,
                starts_at__lt=self.ends_at,
                ends_at__gt=self.starts_at,
            )
            .exclude(status=self.Status.CANCELLED)
            .exclude(pk=self.pk)
        )

    def clean(self) -> None:
        super().clean()
        self._sync_ends_at()
        if (
            self.dentist_id is not None
            and self.ends_at is not None
            and self.status != self.Status.CANCELLED
            and self.overlapping_appointments().exists()
        ):
            raise ValidationError(OVERLAP_ERROR, code="overlap")

    def save(self, *args, **kwargs) -> None:
        self._sync_ends_at()
        super().save(*args, **kwargs)
