from rest_framework import viewsets

from .models import Dentist, Patient, Service
from .serializers import DentistSerializer, PatientSerializer, ServiceSerializer


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    search_fields = ["first_name", "last_name", "email", "phone"]
    ordering_fields = ["last_name", "first_name", "created_at"]


class DentistViewSet(viewsets.ModelViewSet):
    queryset = Dentist.objects.all()
    serializer_class = DentistSerializer
    filterset_fields = ["is_active", "specialty"]
    search_fields = ["first_name", "last_name", "specialty"]
    ordering_fields = ["last_name", "first_name"]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    filterset_fields = ["is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "price", "duration_minutes"]
