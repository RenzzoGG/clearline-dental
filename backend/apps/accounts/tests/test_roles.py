from importlib import import_module

import pytest
from django.apps import apps as django_apps

from apps.accounts.models import User

from .factories import UserFactory

pytestmark = pytest.mark.django_db

Role = User.Role


def test_new_users_default_to_patient():
    assert UserFactory().role == Role.PATIENT


def test_createsuperuser_gets_admin_role():
    user = User.objects.create_superuser("boss", "boss@example.com", "x")

    assert user.role == Role.ADMIN


@pytest.mark.parametrize(
    ("attrs", "is_admin", "is_staff", "is_patient"),
    [
        ({"role": Role.ADMIN}, True, True, False),
        ({"role": Role.RECEPTIONIST}, False, True, False),
        ({"role": Role.PATIENT}, False, False, True),
        # A superuser is always an admin, even with a wrong role.
        ({"role": Role.PATIENT, "is_superuser": True}, True, True, False),
    ],
)
def test_role_helpers(attrs, is_admin, is_staff, is_patient):
    user = UserFactory.build(**attrs)

    assert user.is_clinic_admin is is_admin
    assert user.is_clinic_staff is is_staff
    assert user.is_patient is is_patient


def test_data_migration_assigns_roles_to_existing_users():
    migration = import_module("apps.accounts.migrations.0003_assign_roles_to_existing_users")
    superuser = UserFactory(is_superuser=True, is_staff=True, role=Role.PATIENT)
    staff = UserFactory(is_staff=True, role=Role.PATIENT)
    regular = UserFactory(role=Role.PATIENT)

    migration.assign_roles(django_apps, schema_editor=None)

    for user in (superuser, staff, regular):
        user.refresh_from_db()
    assert superuser.role == Role.ADMIN
    assert staff.role == Role.RECEPTIONIST
    assert regular.role == Role.PATIENT
