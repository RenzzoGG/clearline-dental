"""Creates the database cache table (settings.CACHES) as part of `migrate`.

DRF throttling counts requests in this cache; having it in a migration means a deploy only
needs `manage.py migrate` (and tests get the table automatically).
"""

from django.core.management import call_command
from django.db import migrations


def create_cache_table(apps, schema_editor):
    call_command("createcachetable", database=schema_editor.connection.alias, verbosity=0)


class Migration(migrations.Migration):
    dependencies = []

    operations = [migrations.RunPython(create_cache_table, migrations.RunPython.noop)]
