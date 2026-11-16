import time

from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError, connections


class Command(BaseCommand):
    help = "Block until the default database accepts connections."

    def add_arguments(self, parser):
        parser.add_argument("--timeout", type=int, default=60, help="Seconds to wait.")

    def handle(self, *args, **options):
        deadline = time.monotonic() + options["timeout"]
        self.stdout.write("Waiting for database...")
        while True:
            try:
                connections["default"].ensure_connection()
            except OperationalError:
                if time.monotonic() >= deadline:
                    raise CommandError("Database not available after timeout.") from None
                time.sleep(1)
            else:
                self.stdout.write(self.style.SUCCESS("Database available."))
                return
