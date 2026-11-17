from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import AppointmentViewSet, AvailabilityView, StatsView

router = SimpleRouter()
router.register("appointments", AppointmentViewSet)

urlpatterns = [
    path("availability/", AvailabilityView.as_view(), name="availability"),
    path("stats/", StatsView.as_view(), name="stats"),
    *router.urls,
]
