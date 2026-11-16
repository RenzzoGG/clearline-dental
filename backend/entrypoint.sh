#!/bin/sh
# Container startup: wait for Postgres, apply migrations, then run the given command.
set -e

python manage.py wait_for_db
python manage.py migrate --noinput

exec "$@"
