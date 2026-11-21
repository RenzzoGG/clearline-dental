from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView

from .views import MeView, RegisterView, ThrottledTokenObtainPairView, ThrottledTokenRefreshView

urlpatterns = [
    path("token/", ThrottledTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", ThrottledTokenRefreshView.as_view(), name="token_refresh"),
    # Logout: blacklists the refresh token so it cannot be used again.
    path("token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("register/", RegisterView.as_view(), name="register"),
    path("me/", MeView.as_view(), name="me"),
]
