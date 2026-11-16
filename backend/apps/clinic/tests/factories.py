from decimal import Decimal

import factory

from apps.clinic.models import Dentist, Patient, Service


class PatientFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Patient

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    email = factory.Sequence(lambda n: f"patient{n}@example.com")
    phone = factory.Faker("numerify", text="+1 555 ### ####")


class DentistFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Dentist

    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    specialty = "General dentistry"
    email = factory.Sequence(lambda n: f"dentist{n}@clearline.example")


class ServiceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Service

    name = factory.Sequence(lambda n: f"Service {n}")
    duration_minutes = 30
    price = Decimal("100.00")
