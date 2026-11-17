from django.contrib import admin

from .models import Dentist, Patient, Service


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ["full_name", "email", "phone", "date_of_birth", "user", "created_at"]
    search_fields = ["first_name", "last_name", "email", "phone"]
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Dentist)
class DentistAdmin(admin.ModelAdmin):
    list_display = ["__str__", "specialty", "email", "phone", "is_active"]
    list_filter = ["is_active", "specialty"]
    search_fields = ["first_name", "last_name", "email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "duration_minutes", "price", "is_active"]
    list_filter = ["is_active"]
    list_editable = ["is_active"]
    search_fields = ["name"]
    readonly_fields = ["created_at", "updated_at"]
