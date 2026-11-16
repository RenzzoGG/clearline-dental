from rest_framework import serializers

from .models import Dentist, Patient, Service

TIMESTAMPS = ["created_at", "updated_at"]


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "phone",
            "date_of_birth",
            "notes",
            *TIMESTAMPS,
        ]
        read_only_fields = TIMESTAMPS


class DentistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dentist
        fields = [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "specialty",
            "email",
            "phone",
            "is_active",
            *TIMESTAMPS,
        ]
        read_only_fields = TIMESTAMPS


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = [
            "id",
            "name",
            "description",
            "duration_minutes",
            "price",
            "is_active",
            *TIMESTAMPS,
        ]
        read_only_fields = TIMESTAMPS
