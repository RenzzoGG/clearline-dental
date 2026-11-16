from rest_framework.routers import SimpleRouter

from .views import DentistViewSet, PatientViewSet, ServiceViewSet

router = SimpleRouter()
router.register("patients", PatientViewSet)
router.register("dentists", DentistViewSet)
router.register("services", ServiceViewSet)

urlpatterns = router.urls
