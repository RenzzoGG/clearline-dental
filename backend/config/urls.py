from django.contrib import admin
from django.urls import path

from apps.core.views import health

admin.site.site_header = "Clearline Dental"
admin.site.site_title = "Clearline Dental admin"
admin.site.index_title = "Clinic administration"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
]
