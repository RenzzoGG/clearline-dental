"""Role-based DRF permissions. Row-level filtering lives in each view's get_queryset()."""

from rest_framework.permissions import SAFE_METHODS, BasePermission


def _is_authenticated(request) -> bool:
    return bool(request.user and request.user.is_authenticated)


class IsClinicStaff(BasePermission):
    """Admins and receptionists."""

    def has_permission(self, request, view):
        return _is_authenticated(request) and request.user.is_clinic_staff


class IsClinicAdmin(BasePermission):
    def has_permission(self, request, view):
        return _is_authenticated(request) and request.user.is_clinic_admin


class IsClinicAdminOrReadOnly(BasePermission):
    """Anyone can read (e.g. the public booking flow lists services); only admins write."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return _is_authenticated(request) and request.user.is_clinic_admin


class IsClinicStaffOrPatient(BasePermission):
    """Staff, or a patient user linked to a patient record."""

    def has_permission(self, request, view):
        if not _is_authenticated(request):
            return False
        user = request.user
        return user.is_clinic_staff or (user.is_patient and hasattr(user, "patient_profile"))
