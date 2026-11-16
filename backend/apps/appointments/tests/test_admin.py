import pytest
from django.urls import reverse

from apps.appointments.models import OVERLAP_ERROR, Appointment
from apps.clinic.tests.factories import PatientFactory

from .factories import AppointmentFactory, at

pytestmark = pytest.mark.django_db

MODELS = [
    "clinic_patient",
    "clinic_dentist",
    "clinic_service",
    "appointments_appointment",
]


@pytest.mark.parametrize("model", MODELS)
@pytest.mark.parametrize("page", ["changelist", "add"])
def test_admin_pages_load(admin_client, model, page):
    AppointmentFactory()

    response = admin_client.get(reverse(f"admin:{model}_{page}"))

    assert response.status_code == 200


def test_appointment_changelist_search_and_filters(admin_client):
    appointment = AppointmentFactory(patient__last_name="Zamora")
    url = reverse("admin:appointments_appointment_changelist")

    response = admin_client.get(url, {"q": "Zamora", "status__exact": "pending"})

    assert response.status_code == 200
    assert str(appointment.patient) in response.content.decode()


def test_admin_form_shows_overlap_error(admin_client):
    existing = AppointmentFactory(starts_at=at(9))
    local_start = at(9, 15)

    response = admin_client.post(
        reverse("admin:appointments_appointment_add"),
        {
            "patient": PatientFactory().pk,
            "dentist": existing.dentist.pk,
            "service": existing.service.pk,
            "starts_at_0": local_start.strftime("%Y-%m-%d"),
            "starts_at_1": local_start.strftime("%H:%M:%S"),
            "status": Appointment.Status.PENDING,
            "notes": "",
        },
    )

    assert response.status_code == 200  # form re-rendered with errors, not saved
    assert OVERLAP_ERROR in response.content.decode()
    assert Appointment.objects.count() == 1
