from django.http import Http404
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.throttling import ClientIPScopedRateThrottle

from .demo import demo_accounts
from .serializers import MeSerializer, RegisterSerializer


@extend_schema(responses={201: MeSerializer})
class RegisterView(generics.CreateAPIView):
    """Patient self sign-up. Log in afterwards with the email and password."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]
    authentication_classes = []  # public endpoint: no session/CSRF involved
    throttle_classes = [ClientIPScopedRateThrottle]
    throttle_scope = "auth_register"


class ThrottledTokenObtainPairView(TokenObtainPairView):
    """Login (JWT pair), rate limited per client IP against password guessing."""

    throttle_classes = [ClientIPScopedRateThrottle]
    throttle_scope = "auth_login"


class ThrottledTokenRefreshView(TokenRefreshView):
    throttle_classes = [ClientIPScopedRateThrottle]
    throttle_scope = "auth_refresh"


class MeView(generics.RetrieveAPIView):
    """The authenticated user, its role and linked patient id (if any)."""

    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


@extend_schema(
    responses=inline_serializer(
        "DemoAccounts",
        {
            "accounts": serializers.ListField(
                child=inline_serializer(
                    "DemoAccount",
                    {
                        "role": serializers.CharField(),
                        "label": serializers.CharField(),
                        "username": serializers.CharField(),
                        "password": serializers.CharField(),
                    },
                )
            )
        },
    )
)
class DemoAccountsView(generics.GenericAPIView):
    """Public demo credentials for the login page. 404 unless demo mode is on."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        accounts = demo_accounts()
        if not accounts:
            raise Http404
        return Response({"accounts": [account.__dict__ for account in accounts]})
