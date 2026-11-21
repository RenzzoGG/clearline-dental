from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .serializers import MeSerializer, RegisterSerializer


@extend_schema(responses={201: MeSerializer})
class RegisterView(generics.CreateAPIView):
    """Patient self sign-up. Log in afterwards with the email and password."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # public endpoint: no session/CSRF involved
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_register"


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login (JWT pair), rate limited per client IP against password guessing."""

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_login"


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth_refresh"


class MeView(generics.RetrieveAPIView):
    """The authenticated user, its role and linked patient id (if any)."""

    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
