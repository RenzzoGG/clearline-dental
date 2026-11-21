from django.contrib import admin
from django.urls import include, path, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.accounts.views import DemoAccountsView
from apps.core.views import health

from . import spa

admin.site.site_header = "Clearline Dental"
admin.site.site_title = "Clearline Dental admin"
admin.site.index_title = "Clinic administration"

# Anything not under the API/admin/static/asset prefixes and not file-like ("x.ico", also
# with a trailing slash, which APPEND_SLASH would otherwise try and redirect to).
SPA_ROUTE = r"^(?!(?:api|admin|static|assets|img)(?:/|$))(?!.*\.[A-Za-z0-9]+/?$).*$"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/demo/", DemoAccountsView.as_view(), name="demo"),
    path("api/", include("apps.clinic.urls")),
    path("api/", include("apps.appointments.urls")),
    # Frontend routes -> index.html (production build only). Excludes the API, admin, static
    # files, the build's own asset folders and anything that looks like a file, so a missing
    # asset or endpoint stays a real 404 instead of returning the app.
    re_path(SPA_ROUTE, spa.index, name="spa"),
]
