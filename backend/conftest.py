import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.accounts.tests.factories import UserFactory
from apps.clinic.tests.factories import PatientFactory


def _client_for(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def api_client():
    """Anonymous API client."""
    return APIClient()


@pytest.fixture
def staff_client(db):
    """Authenticated as a receptionist (front desk staff)."""
    return _client_for(UserFactory(role=User.Role.RECEPTIONIST))


@pytest.fixture
def clinic_admin_client(db):
    """Authenticated as a clinic admin. (pytest-django already owns `admin_client`.)"""
    return _client_for(UserFactory(role=User.Role.ADMIN))


@pytest.fixture
def patient_user(db):
    """A patient login account linked to its patient record (user.patient_profile)."""
    user = UserFactory(role=User.Role.PATIENT)
    PatientFactory(user=user, email=user.email)
    return user


@pytest.fixture
def patient_client(patient_user):
    return _client_for(patient_user)
