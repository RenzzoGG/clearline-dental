"""Public demo mode (docs/DEPLOY.md §5).

Two demo accounts whose passwords come from environment variables (never from the repo).
They are public by design: with DEMO_MODE on, the login page shows them. Nightly
`manage.py reset_demo` recreates them along with the demo data.
"""

from dataclasses import dataclass

from django.conf import settings

DEMO_RECEPTIONIST_USERNAME = "demo-reception"
DEMO_PATIENT_EMAIL = "demo.patient@clearline.test"
DEMO_USERNAMES = frozenset({DEMO_RECEPTIONIST_USERNAME, DEMO_PATIENT_EMAIL})


@dataclass(frozen=True)
class DemoAccount:
    role: str
    label: str
    username: str
    password: str


def demo_accounts() -> list[DemoAccount]:
    """The demo accounts, or [] when demo mode is off or a password is not configured."""
    receptionist = settings.DEMO_RECEPTIONIST_PASSWORD
    patient = settings.DEMO_PATIENT_PASSWORD
    if not (settings.DEMO_MODE and receptionist and patient):
        return []
    return [
        DemoAccount("receptionist", "Front desk", DEMO_RECEPTIONIST_USERNAME, receptionist),
        DemoAccount("patient", "Patient", DEMO_PATIENT_EMAIL, patient),
    ]
