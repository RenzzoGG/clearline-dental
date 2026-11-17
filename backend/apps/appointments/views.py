from django.db import IntegrityError, transaction
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

from apps.accounts.permissions import IsClinicStaff, IsClinicStaffOrPatient
from apps.core.exceptions import Conflict

from .availability import available_slots
from .filters import AppointmentFilter
from .models import OVERLAP_ERROR, Appointment, InvalidTransition
from .serializers import (
    AppointmentSerializer,
    AvailabilityQuerySerializer,
    AvailabilitySerializer,
)

OVERLAP_CONSTRAINT = "appointment_no_dentist_overlap"


class AppointmentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Appointments. No DELETE: appointments are cancelled, never removed.

    Staff see and manage everything. Patients list, view, book and cancel only their
    own appointments; anyone else's appointment is a 404 (row-level filtering).
    """

    PATIENT_ACTIONS = frozenset({"list", "retrieve", "create", "cancel"})

    queryset = Appointment.objects.select_related("patient", "dentist", "service")
    serializer_class = AppointmentSerializer
    filterset_class = AppointmentFilter
    search_fields = ["patient__first_name", "patient__last_name", "patient__email"]
    ordering_fields = ["starts_at", "created_at"]
    ordering = ["starts_at"]

    def get_permissions(self):
        if self.action in self.PATIENT_ACTIONS:
            return [IsClinicStaffOrPatient()]
        return [IsClinicStaff()]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return queryset.none()  # e.g. schema generation; permissions already block access
        if user.is_clinic_staff:
            return queryset
        # Like a row-level security policy: patients only ever see their own rows.
        return queryset.filter(patient__user=user)

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_clinic_staff:
            self._save_guarding_overlap(serializer)
        else:
            self._save_guarding_overlap(serializer, patient=user.patient_profile)

    def perform_update(self, serializer):
        self._save_guarding_overlap(serializer)

    @staticmethod
    def _save_guarding_overlap(serializer, **extra):
        # clean() already checked overlaps; this catches the race where two requests
        # pass validation at the same time and the database constraint rejects one.
        try:
            with transaction.atomic():
                serializer.save(**extra)
        except IntegrityError as exc:
            if OVERLAP_CONSTRAINT in str(exc):
                # Same shape as the error raised by validate() for a normal overlap.
                raise serializers.ValidationError(
                    {api_settings.NON_FIELD_ERRORS_KEY: [OVERLAP_ERROR]}
                ) from exc
            raise

    def _transition(self, new_status):
        appointment = self.get_object()
        try:
            appointment.transition_to(new_status)
        except InvalidTransition as exc:
            raise Conflict(str(exc)) from exc
        return Response(self.get_serializer(appointment).data)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(Appointment.Status.CONFIRMED)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._transition(Appointment.Status.COMPLETED)

    @extend_schema(request=None, responses=AppointmentSerializer)
    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(Appointment.Status.CANCELLED)


class AvailabilityView(APIView):
    """Free start times for a dentist and service on a given date (clinic local time)."""

    permission_classes = [AllowAny]

    @extend_schema(parameters=[AvailabilityQuerySerializer], responses=AvailabilitySerializer)
    def get(self, request):
        query = AvailabilityQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        dentist = query.validated_data["dentist"]
        service = query.validated_data["service"]
        day = query.validated_data["date"]

        data = {
            "date": day,
            "dentist": dentist.pk,
            "service": service.pk,
            "duration_minutes": service.duration_minutes,
            "slots": available_slots(dentist, service, day),
        }
        return Response(AvailabilitySerializer(data).data)
