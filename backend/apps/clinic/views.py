from rest_framework import viewsets

from apps.accounts.permissions import IsClinicAdminOrReadOnly

from .models import Dentist, Patient, Service
from .serializers import DentistSerializer, PatientSerializer, ServiceSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """Front desk only (default IsClinicStaff). Patients see themselves via /api/auth/me/."""

    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    search_fields = ["first_name", "last_name", "email", "phone"]
    ordering_fields = ["last_name", "first_name", "created_at"]


class ActiveForPublicMixin:
    """Non-staff (including anonymous visitors) only see active records."""

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if not (user.is_authenticated and user.is_clinic_staff):
            queryset = queryset.filter(is_active=True)
        return queryset


class DentistViewSet(ActiveForPublicMixin, viewsets.ModelViewSet):
    """Public read (booking flow); admins write."""

    queryset = Dentist.objects.all()
    serializer_class = DentistSerializer
    permission_classes = [IsClinicAdminOrReadOnly]
    filterset_fields = ["is_active", "specialty"]
    search_fields = ["first_name", "last_name", "specialty"]
    ordering_fields = ["last_name", "first_name"]


class ServiceViewSet(ActiveForPublicMixin, viewsets.ModelViewSet):
    """Public read (booking flow); admins write."""

    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsClinicAdminOrReadOnly]
    filterset_fields = ["is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "price", "duration_minutes"]
