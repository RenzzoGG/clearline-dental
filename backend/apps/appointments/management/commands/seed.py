"""Populate the database with fictional demo data.

Usage:
    python manage.py seed           # only if the clinic tables are empty
    python manage.py seed --reset   # wipe clinic data and seed again

Uses no dev-only dependencies so it can also run in production for a demo.
"""

import random
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinic.models import Dentist, Patient, Service

DENTISTS = [
    ("Sofia", "Ramirez", "General dentistry"),
    ("Daniel", "Okafor", "Orthodontics"),
    ("Mei", "Tanaka", "Endodontics"),
    ("Lucas", "Moreau", "Pediatric dentistry"),
]

SERVICES = [
    ("Checkup & cleaning", "Routine exam with professional cleaning.", 30, "60.00"),
    ("Teeth whitening", "In-office whitening session.", 60, "250.00"),
    ("Cavity filling", "Composite filling for one tooth.", 45, "120.00"),
    ("Root canal", "Endodontic treatment for one tooth.", 90, "650.00"),
    ("Orthodontic consultation", "Evaluation and treatment plan.", 30, "80.00"),
    ("Tooth extraction", "Simple extraction with local anesthesia.", 45, "180.00"),
]

FIRST_NAMES = (
    "Ana Carlos Emma Liam Valeria Noah Olivia Mateo Ava Diego Mia Ethan Camila "
    "James Lucia Benjamin Isabella Samuel Chloe Leo Grace Hugo Zoe Adrian Nora"
).split()
LAST_NAMES = (
    "Garcia Smith Hernandez Johnson Lopez Brown Martinez Davis Gonzalez Wilson "
    "Perez Taylor Sanchez Clark Torres Lewis"
).split()

PATIENT_COUNT = 40
DAYS_BACK = 14
DAYS_AHEAD = 14
OPENING = time(9, 0)
CLOSING = time(18, 0)
SLOT_STEP = timedelta(minutes=15)
SUNDAY = 6


class Command(BaseCommand):
    help = "Seed the database with fictional dentists, services, patients and appointments."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing clinic data before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset"]:
            self._wipe()
        elif Dentist.objects.exists() or Patient.objects.exists():
            self.stdout.write(
                self.style.WARNING("Clinic data already exists. Use --reset to re-seed.")
            )
            return

        rng = random.Random(42)
        dentists = self._create_dentists()
        services = self._create_services()
        patients = self._create_patients(rng)
        appointments = self._create_appointments(rng, dentists, services, patients)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(dentists)} dentists, {len(services)} services, "
                f"{len(patients)} patients and {appointments} appointments."
            )
        )

    def _wipe(self) -> None:
        # Appointments first: the other tables are protected by on_delete=PROTECT.
        Appointment.objects.all().delete()
        Patient.objects.all().delete()
        Dentist.objects.all().delete()
        Service.objects.all().delete()

    def _create_dentists(self) -> list[Dentist]:
        return Dentist.objects.bulk_create(
            Dentist(
                first_name=first,
                last_name=last,
                specialty=specialty,
                email=f"{first}.{last}@clearline.example".lower(),
                phone=f"+1 555 010{index}",
            )
            for index, (first, last, specialty) in enumerate(DENTISTS)
        )

    def _create_services(self) -> list[Service]:
        return Service.objects.bulk_create(
            Service(
                name=name,
                description=description,
                duration_minutes=minutes,
                price=Decimal(price),
            )
            for name, description, minutes, price in SERVICES
        )

    def _create_patients(self, rng: random.Random) -> list[Patient]:
        patients = []
        for index in range(PATIENT_COUNT):
            first = rng.choice(FIRST_NAMES)
            last = rng.choice(LAST_NAMES)
            patients.append(
                Patient(
                    first_name=first,
                    last_name=last,
                    email=f"{first}.{last}.{index}@example.com".lower(),
                    phone=f"+1 555 {rng.randint(1000000, 9999999)}",
                    date_of_birth=date(
                        rng.randint(1950, 2018), rng.randint(1, 12), rng.randint(1, 28)
                    ),
                )
            )
        return Patient.objects.bulk_create(patients)

    def _create_appointments(self, rng, dentists, services, patients) -> int:
        tz = timezone.get_current_timezone()
        now = timezone.now()
        today = timezone.localdate()
        appointments = []

        for offset in range(-DAYS_BACK, DAYS_AHEAD + 1):
            day = today + timedelta(days=offset)
            if day.weekday() == SUNDAY:
                continue
            closing = datetime.combine(day, CLOSING, tzinfo=tz)

            for dentist in dentists:
                cursor = datetime.combine(day, OPENING, tzinfo=tz)
                while True:
                    # Leave random gaps so the schedule is not 100% booked.
                    cursor += SLOT_STEP * rng.choice([0, 0, 1, 2, 4])
                    service = rng.choice(services)
                    ends_at = cursor + timedelta(minutes=service.duration_minutes)
                    if ends_at > closing:
                        break
                    appointments.append(
                        Appointment(
                            patient=rng.choice(patients),
                            dentist=dentist,
                            service=service,
                            starts_at=cursor,
                            # bulk_create skips save(), so ends_at is set explicitly.
                            ends_at=ends_at,
                            status=self._pick_status(rng, is_past=ends_at <= now),
                        )
                    )
                    cursor = ends_at

        Appointment.objects.bulk_create(appointments)
        return len(appointments)

    @staticmethod
    def _pick_status(rng: random.Random, *, is_past: bool) -> str:
        status = Appointment.Status
        if is_past:
            return rng.choices([status.COMPLETED, status.CANCELLED], weights=[85, 15])[0]
        return rng.choices(
            [status.PENDING, status.CONFIRMED, status.CANCELLED], weights=[40, 50, 10]
        )[0]
