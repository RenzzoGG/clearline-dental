from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel

MIN_SERVICE_MINUTES = 5
MAX_SERVICE_MINUTES = 480


class Patient(TimeStampedModel):
    # Optional login account. Patients registered by the front desk may not have one;
    # deleting the account keeps the clinical record.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_profile",
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30)
    date_of_birth = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Dentist(TimeStampedModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialty = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self) -> str:
        return f"Dr. {self.first_name} {self.last_name}"

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Service(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    duration_minutes = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(MIN_SERVICE_MINUTES),
            MaxValueValidator(MAX_SERVICE_MINUTES),
        ],
    )
    price = models.DecimalField(max_digits=8, decimal_places=2, validators=[MinValueValidator(0)])
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    duration_minutes__gte=MIN_SERVICE_MINUTES,
                    duration_minutes__lte=MAX_SERVICE_MINUTES,
                ),
                name="service_duration_in_range",
            ),
            models.CheckConstraint(
                condition=models.Q(price__gte=0),
                name="service_price_non_negative",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.duration_minutes} min)"
