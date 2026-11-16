import pytest
from rest_framework.test import APIClient

from apps.accounts.tests.factories import UserFactory


@pytest.fixture
def api_client():
    """Anonymous API client."""
    return APIClient()


@pytest.fixture
def staff_client(db):
    """API client authenticated as a staff user (required by the API until phase 4)."""
    client = APIClient()
    client.force_authenticate(UserFactory(is_staff=True))
    return client
