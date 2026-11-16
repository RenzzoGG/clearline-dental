from datetime import datetime

import factory
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinic.tests.factories import DentistFactory, PatientFactory, ServiceFactory


def at(hour: int, minute: int = 0, *, day: int = 10) -> datetime:
    """Aware datetime in the clinic's timezone on a fixed future date, for readable tests."""
    return datetime(2030, 6, day, hour, minute, tzinfo=timezone.get_current_timezone())


class AppointmentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Appointment

    patient = factory.SubFactory(PatientFactory)
    dentist = factory.SubFactory(DentistFactory)
    service = factory.SubFactory(ServiceFactory)
    starts_at = factory.LazyFunction(lambda: at(9))
