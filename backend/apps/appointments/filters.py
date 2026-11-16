import django_filters

from .models import Appointment


class AppointmentFilter(django_filters.FilterSet):
    # Dates are interpreted in the clinic's local time zone (settings.TIME_ZONE).
    date_from = django_filters.DateFilter(field_name="starts_at", lookup_expr="date__gte")
    date_to = django_filters.DateFilter(field_name="starts_at", lookup_expr="date__lte")

    class Meta:
        model = Appointment
        fields = ["dentist", "patient", "service", "status"]
