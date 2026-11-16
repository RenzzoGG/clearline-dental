from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Project user model.

    Empty for now, but it exists from the very first migration so we can add fields
    (e.g. ``role`` in phase 4) without fighting Django's auth migrations later.
    """
