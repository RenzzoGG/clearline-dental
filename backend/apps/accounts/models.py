from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import UserManager as DjangoUserManager
from django.db import models


class UserManager(DjangoUserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("role", User.Role.ADMIN)
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    """Project user model with a clinic role."""

    class Role(models.TextChoices):
        ADMIN = "admin", "Admin"
        RECEPTIONIST = "receptionist", "Receptionist"
        PATIENT = "patient", "Patient"

    # Least privilege by default: staff roles are always assigned explicitly.
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.PATIENT)

    objects = UserManager()

    @property
    def is_clinic_admin(self) -> bool:
        return self.is_superuser or self.role == self.Role.ADMIN

    @property
    def is_clinic_staff(self) -> bool:
        return self.is_clinic_admin or self.role == self.Role.RECEPTIONIST

    @property
    def is_patient(self) -> bool:
        return not self.is_clinic_staff and self.role == self.Role.PATIENT
