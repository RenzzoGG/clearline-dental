from django.contrib import admin

from .models import Appointment


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["starts_at", "ends_at", "patient", "dentist", "service", "status"]
    list_filter = ["status", "dentist", "service"]
    search_fields = [
        "patient__first_name",
        "patient__last_name",
        "patient__email",
        "dentist__last_name",
    ]
    date_hierarchy = "starts_at"
    autocomplete_fields = ["patient", "dentist", "service"]
    list_select_related = ["patient", "dentist", "service"]
    readonly_fields = ["ends_at", "created_at", "updated_at"]
    fields = [
        "patient",
        "dentist",
        "service",
        "starts_at",
        "ends_at",
        "status",
        "notes",
        "created_at",
        "updated_at",
    ]
