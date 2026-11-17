"""Backfill roles for users created before the role field existed.

Without this, existing superusers would end up with the default "patient" role.
"""

from django.db import migrations


def assign_roles(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_superuser=True).update(role="admin")
    User.objects.filter(is_superuser=False, is_staff=True).update(role="receptionist")


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_alter_user_managers_user_role"),
    ]

    operations = [
        migrations.RunPython(assign_roles, migrations.RunPython.noop),
    ]
