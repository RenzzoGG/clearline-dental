"""Django settings for Clearline Dental.

All environment-specific values come from environment variables (see .env.example).
"""

import re
from datetime import timedelta
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    DJANGO_CORS_ALLOWED_ORIGINS=(list, ["http://localhost:5173"]),
    DJANGO_CSRF_TRUSTED_ORIGINS=(list, []),
    # Production behind an HTTPS proxy (Railway): redirects, secure cookies, HSTS.
    DJANGO_HTTPS=(bool, False),
    DJANGO_SECURE_HSTS_SECONDS=(int, 0),
    # Reverse proxies in front of Django, for the client IP used by throttling.
    DJANGO_NUM_PROXIES=(int, 0),
    # Header a trusted proxy overwrites with the client IP (Railway: X-Real-IP). Takes
    # precedence over NUM_PROXIES for throttling; leave empty when nothing overwrites it.
    DJANGO_CLIENT_IP_HEADER=(str, ""),
    DJANGO_STATIC_MANIFEST=(bool, False),
    # Public demo (apps/accounts/demo.py): accounts shown on the login page, reset nightly.
    DEMO_MODE=(bool, False),
    DEMO_RECEPTIONIST_PASSWORD=(str, ""),
    DEMO_PATIENT_PASSWORD=(str, ""),
)

# --- Core ---------------------------------------------------------------------

SECRET_KEY = env("DJANGO_SECRET_KEY")
# The secret key also signs JWTs (HMAC-SHA256); a short one could be brute-forced.
MIN_SECRET_KEY_LENGTH = 50
if len(SECRET_KEY) < MIN_SECRET_KEY_LENGTH:
    raise ImproperlyConfigured(
        f"DJANGO_SECRET_KEY must be at least {MIN_SECRET_KEY_LENGTH} characters. "
        'Generate one with: python3 -c "import secrets; print(secrets.token_urlsafe(50))"'
    )
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("DJANGO_CSRF_TRUSTED_ORIGINS")

DEMO_MODE = env("DEMO_MODE")
DEMO_RECEPTIONIST_PASSWORD = env("DEMO_RECEPTIONIST_PASSWORD")
DEMO_PATIENT_PASSWORD = env("DEMO_PATIENT_PASSWORD")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    # Third-party
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    # Local apps
    "apps.core",
    "apps.accounts",
    "apps.clinic",
    "apps.appointments",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Serves static files (admin, DRF) and the built frontend (see WHITENOISE_ROOT).
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # Must run before CommonMiddleware so CORS headers are added to every response.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database -----------------------------------------------------------------
# DATABASE_URL example: postgres://user:password@db:5432/clearline

DATABASES = {"default": env.db("DATABASE_URL")}
# Reuse connections for a minute (with a liveness check) instead of one per request.
DATABASES["default"]["CONN_MAX_AGE"] = 60
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True

# Shared cache in Postgres (no Redis needed): backs DRF throttling across gunicorn workers.
# The table is created by a migration (apps/core), so `migrate` is all a deploy needs.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Auth ---------------------------------------------------------------------
# Custom user model, defined before the first migration on purpose.

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- I18N ---------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
# Clinic local time. Hermosillo is UTC-7 all year (no daylight saving time).
TIME_ZONE = "America/Hermosillo"
USE_I18N = True
USE_TZ = True

# --- Static files -------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# Hashed + compressed static files in the production image (its Dockerfile sets
# DJANGO_STATIC_MANIFEST for collectstatic and at runtime). Tests and local development keep
# the plain storage, which needs no collectstatic.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": (
            "whitenoise.storage.CompressedManifestStaticFilesStorage"
            if env("DJANGO_STATIC_MANIFEST")
            else "django.contrib.staticfiles.storage.StaticFilesStorage"
        )
    },
}

# The built frontend (Vite `dist/`), copied into the production image. WhiteNoise serves its
# files from the site root (/assets/*, /img/*, /robots.txt...) and config.spa.index serves
# index.html for the app's routes. Absent in local development (Vite serves the frontend).
FRONTEND_DIST = BASE_DIR / "frontend_dist"
if FRONTEND_DIST.is_dir():
    WHITENOISE_ROOT = FRONTEND_DIST


_DJANGO_HASHED_STATIC = re.compile(r"^/static/.+\.[0-9a-f]{12}\.\w+$")


def _immutable_file(path, url):
    """Content-hashed files never change, so browsers may cache them for a year: Vite's
    /assets/ and the hashed names collectstatic writes under /static/ (admin, DRF)."""
    return url.startswith("/assets/") or bool(_DJANGO_HASHED_STATIC.match(url))


WHITENOISE_IMMUTABLE_FILE_TEST = _immutable_file

# --- REST API -----------------------------------------------------------------

REST_FRAMEWORK = {
    # JWT for the frontend and the chatbot; session reuses the admin login (Swagger).
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # Secure by default: staff only. Views open up explicitly for patients/public.
    "DEFAULT_PERMISSION_CLASSES": ["apps.accounts.permissions.IsClinicStaff"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.core.exceptions.api_exception_handler",
    # Opt-in per view with throttle_scope and apps.core.throttling.ClientIPScopedRateThrottle.
    # Anonymous requests are counted per client IP, authenticated ones per user.
    "DEFAULT_THROTTLE_RATES": {
        "auth_login": "10/min",
        "auth_register": "5/hour",
        "auth_refresh": "30/min",
        "booking": "20/hour",
        "availability": "120/min",
    },
    "NUM_PROXIES": env("DJANGO_NUM_PROXIES"),
}
CLIENT_IP_HEADER = env("DJANGO_CLIENT_IP_HEADER")

SPECTACULAR_SETTINGS = {
    "TITLE": "Clearline Dental API",
    "DESCRIPTION": (
        "Appointment booking API for a fictional dental clinic. "
        "Datetimes are ISO 8601 with offset; dates are in the clinic's local time zone."
    ),
    "VERSION": "0.3.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Each refresh returns a new refresh token and blacklists the old one.
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": True,
}

# --- CORS ---------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env("DJANGO_CORS_ALLOWED_ORIGINS")

# --- Security -----------------------------------------------------------------------------
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"

if env("DJANGO_HTTPS"):
    # TLS ends at the platform's proxy, which reports the original scheme in this header.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    # The platform's healthcheck calls the container over plain HTTP: never redirect it.
    SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # Start low and raise once everything works. No includeSubDomains: other subdomains of
    # the parent domain are not part of this project.
    SECURE_HSTS_SECONDS = env("DJANGO_SECURE_HSTS_SECONDS")
    # Deliberate (docs/DEPLOY.md §3): the parent domain has other subdomains that are not
    # part of this project, so HSTS must not cover them nor be submitted for preload.
    SILENCED_SYSTEM_CHECKS = ["security.W005", "security.W021"]

# --- Logging: everything to stdout (the platform collects it) -----------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django.request": {"level": "WARNING"}},
}
