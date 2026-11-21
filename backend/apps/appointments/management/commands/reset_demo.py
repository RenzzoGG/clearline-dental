"""Reset the public demo (docs/DEPLOY.md §5). Runs nightly as a Railway cron service.

    python manage.py reset_demo

1. Deletes every patient login account (visitors' sign-ups, and the demo patient).
2. Re-seeds the clinic data (`seed --reset`: dentists, services, patients, appointments).
3. Recreates the two demo accounts with the passwords from DEMO_RECEPTIONIST_PASSWORD and
   DEMO_PATIENT_PASSWORD, and gives the demo patient a past and an upcoming appointment.

Superusers and staff accounts other than the demo receptionist are never touched. It all
runs in one transaction: if anything fails, the database is left as it was.
"""

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.demo import DEMO_PATIENT_EMAIL, DEMO_RECEPTIONIST_USERNAME, demo_accounts
from apps.accounts.models import User
from apps.appointments.models import Appointment
from apps.clinic.models import Patient


class Command(BaseCommand):
    help = "Reset the public demo: re-seed the clinic data and recreate the demo accounts."

    @transaction.atomic
    def handle(self, *args, **options):
        accounts = {account.role: account for account in demo_accounts()}
        if not accounts:
            raise CommandError(
                "Demo mode is off or a demo password is missing: set DEMO_MODE, "
                "DEMO_RECEPTIONIST_PASSWORD and DEMO_PATIENT_PASSWORD."
            )

        removed, _ = User.objects.filter(
            role=User.Role.PATIENT, is_superuser=False, is_staff=False
        ).delete()
        call_command("seed", reset=True, stdout=self.stdout)

        receptionist, _ = User.objects.update_or_create(
            username=DEMO_RECEPTIONIST_USERNAME,
            defaults={
                "role": User.Role.RECEPTIONIST,
                "first_name": "Demo",
                "last_name": "Reception",
                "email": "demo.reception@clearline.test",
                "is_staff": False,  # no Django admin access
                "is_superuser": False,
                "is_active": True,
            },
        )
        receptionist.set_password(accounts["receptionist"].password)
        receptionist.save()

        patient_user = User.objects.create_user(
            username=DEMO_PATIENT_EMAIL,
            email=DEMO_PATIENT_EMAIL,
            password=accounts["patient"].password,
            first_name="Dana",
            last_name="Demo",
            role=User.Role.PATIENT,
        )
        patient = Patient.objects.create(
            user=patient_user,
            first_name="Dana",
            last_name="Demo",
            email=DEMO_PATIENT_EMAIL,
            phone="+52 662 555 0199",
        )

        # Reassign two seeded appointments (no new rows, so no risk of overlapping a
        # dentist's schedule): one completed visit and the next pending one.
        now = timezone.now()
        mine = [
            Appointment.objects.filter(status=Appointment.Status.COMPLETED, starts_at__lt=now)
            .order_by("-starts_at")
            .first(),
            Appointment.objects.filter(status=Appointment.Status.PENDING, starts_at__gt=now)
            .order_by("starts_at")
            .first(),
        ]
        Appointment.objects.filter(pk__in=[a.pk for a in mine if a]).update(patient=patient)

        self.stdout.write(
            self.style.SUCCESS(
                f"Demo reset: removed {removed} visitor objects, recreated "
                f"{DEMO_RECEPTIONIST_USERNAME} and {DEMO_PATIENT_EMAIL} "
                f"({sum(1 for a in mine if a)} appointments for the demo patient)."
            )
        )
