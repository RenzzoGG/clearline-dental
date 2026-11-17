from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from apps.clinic.models import Dentist, Service

from .models import Appointment
from .schedule import OPENING_HOURS_LABEL, is_within_opening_hours

SCHEDULING_FIELDS = ("dentist", "service", "starts_at")


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    dentist_name = serializers.CharField(source="dentist.full_name", read_only=True)
    service_name = serializers.CharField(source="service.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "patient",
            "patient_name",
            "dentist",
            "dentist_name",
            "service",
            "service_name",
            "starts_at",
            "ends_at",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        # Status only changes through the confirm/complete/cancel actions.
        read_only_fields = ["ends_at", "status", "created_at", "updated_at"]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        user = getattr(request, "user", None)
        # Patients always book for themselves: the view sets `patient` on save.
        if user is not None and user.is_authenticated and not user.is_clinic_staff:
            fields["patient"].read_only = True
        return fields

    def validate(self, attrs):
        instance = self.instance
        if instance is not None and instance.is_final:
            raise serializers.ValidationError(
                f"A {instance.status} appointment cannot be modified."
            )

        values = {
            field: attrs.get(field, getattr(instance, field, None))
            for field in ("patient", *SCHEDULING_FIELDS)
        }
        scheduling_changed = instance is None or any(
            values[field] != getattr(instance, field) for field in SCHEDULING_FIELDS
        )
        if scheduling_changed:
            self._validate_booking_policy(values["dentist"], values["service"], values["starts_at"])

        # Model invariants (overlap check) live in Appointment.clean().
        candidate = Appointment(
            pk=getattr(instance, "pk", None),
            status=getattr(instance, "status", Appointment.Status.PENDING),
            **values,
        )
        try:
            candidate.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return attrs

    @staticmethod
    def _validate_booking_policy(dentist: Dentist, service: Service, starts_at) -> None:
        errors = {}
        if not dentist.is_active:
            errors["dentist"] = "This dentist is not accepting appointments."
        if not service.is_active:
            errors["service"] = "This service is not available."
        ends_at = starts_at + timedelta(minutes=service.duration_minutes)
        if starts_at <= timezone.now():
            errors["starts_at"] = "Appointments must be scheduled in the future."
        elif not is_within_opening_hours(starts_at, ends_at):
            errors["starts_at"] = (
                f"Appointments must fit within opening hours ({OPENING_HOURS_LABEL})."
            )
        if errors:
            raise serializers.ValidationError(errors)


class AvailabilityQuerySerializer(serializers.Serializer):
    dentist = serializers.PrimaryKeyRelatedField(queryset=Dentist.objects.filter(is_active=True))
    service = serializers.PrimaryKeyRelatedField(queryset=Service.objects.filter(is_active=True))
    date = serializers.DateField()


class SlotSerializer(serializers.Serializer):
    starts_at = serializers.DateTimeField()
    ends_at = serializers.DateTimeField()


class AvailabilitySerializer(serializers.Serializer):
    date = serializers.DateField()
    dentist = serializers.IntegerField()
    service = serializers.IntegerField()
    duration_minutes = serializers.IntegerField()
    slots = SlotSerializer(many=True)


MAX_STATS_DAYS = 366


class StatsQuerySerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()

    def validate(self, attrs):
        span = (attrs["date_to"] - attrs["date_from"]).days
        if span < 0:
            raise serializers.ValidationError({"date_to": "Must be on or after date_from."})
        if span >= MAX_STATS_DAYS:
            raise serializers.ValidationError(
                {"date_to": f"The range cannot exceed {MAX_STATS_DAYS} days."}
            )
        return attrs


class DayCountSerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()


class ServiceCountSerializer(serializers.Serializer):
    service = serializers.CharField()
    count = serializers.IntegerField()


class StatusCountsSerializer(serializers.Serializer):
    pending = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()


class StatsSerializer(serializers.Serializer):
    date_from = serializers.DateField()
    date_to = serializers.DateField()
    total = serializers.IntegerField()
    by_status = StatusCountsSerializer()
    cancellation_rate = serializers.FloatField()
    by_day = DayCountSerializer(many=True)
    by_service = ServiceCountSerializer(many=True)
