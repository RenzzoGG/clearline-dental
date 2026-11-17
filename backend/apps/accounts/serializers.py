from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from apps.clinic.models import Patient

from .models import User

DUPLICATE_EMAIL = (
    "An account with this email already exists. "
    "If you are already a patient, please contact the clinic."
)


class MeSerializer(serializers.ModelSerializer):
    patient = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "patient"]
        read_only_fields = fields

    def get_patient(self, user: User) -> int | None:
        profile = getattr(user, "patient_profile", None)
        return profile.pk if profile else None


class RegisterSerializer(serializers.Serializer):
    """Self sign-up for patients: creates a login account and its patient record."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=30)
    date_of_birth = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value: str) -> str:
        email = value.strip().lower()
        # Existing patient records are not auto-linked: without email verification,
        # anyone could claim someone else's appointment history.
        if (
            User.objects.filter(username__iexact=email).exists()
            or User.objects.filter(email__iexact=email).exists()
            or Patient.objects.filter(email__iexact=email).exists()
        ):
            raise serializers.ValidationError(DUPLICATE_EMAIL)
        return email

    def validate(self, attrs):
        candidate = User(
            username=attrs["email"],
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs["last_name"],
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            role=User.Role.PATIENT,
        )
        Patient.objects.create(
            user=user,
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            email=validated_data["email"],
            phone=validated_data["phone"],
            date_of_birth=validated_data.get("date_of_birth"),
        )
        return user

    def to_representation(self, instance):
        return MeSerializer(instance).data
