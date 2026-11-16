from django.db import IntegrityError, transaction
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView

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
    """Appointments. No DELETE: appointments are cancelled, never removed."""

    queryset = Appointment.objects.select_related("patient", "dentist", "service")
    serializer_class = AppointmentSerializer
    filterset_class = AppointmentFilter
    search_fields = ["patient__first_name", "patient__last_name", "patient__email"]
    ordering_fields = ["starts_at", "created_at"]
    ordering = ["starts_at"]

    def perform_create(self, serializer):
        self._save_guarding_overlap(serializer)

    def perform_update(self, serializer):
        self._save_guarding_overlap(serializer)

    @staticmethod
    def _save_guarding_overlap(serializer):
        # clean() already checked overlaps; this catches the race where two requests
        # pass validation at the same time and the database constraint rejects one.
        try:
            with transaction.atomic():
                serializer.save()
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
