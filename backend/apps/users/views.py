from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserSerializer

# ---------------------------------------------------------
#  Mixin pour gérer les cookies JWT
# ---------------------------------------------------------
class CookieMixin:
    def set_jwt_cookies(self, response, access_token, refresh_token):

        response.set_cookie(
            key=settings.JWT_AUTH_COOKIE,
            value=str(access_token),
            httponly=True,
            secure=not settings.DEBUG,     # True en production
            samesite=settings.JWT_AUTH_SAMESITE,
            max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
            path="/",
        )

        response.set_cookie(
            key=settings.JWT_AUTH_REFRESH_COOKIE,
            value=str(refresh_token),
            httponly=True,
            secure=not settings.DEBUG,
            samesite=settings.JWT_AUTH_SAMESITE,
            max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds(),
            path="/",
        )

        return response

    def clear_jwt_cookies(self, response):
        response.delete_cookie(settings.JWT_AUTH_COOKIE, path="/")
        response.delete_cookie(settings.JWT_AUTH_REFRESH_COOKIE, path="/")
        return response


# ---------------------------------------------------------
#  REGISTER
# ---------------------------------------------------------
class RegisterView(CookieMixin, generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]  # important pour POST sans auth

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response(
            {"user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED
        )
        self.set_jwt_cookies(response, access, refresh)
        return response

# ---------------------------------------------------------
#  LOGIN
# ---------------------------------------------------------
class LoginView(CookieMixin, APIView):
    permission_classes = [AllowAny]  # important pour POST sans auth

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        user = authenticate(email=email, password=password)
        if not user:
            return Response({"detail": "Invalid credentials"}, status=400)

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response(
            {"user": UserSerializer(user).data},
            status=200
        )
        self.set_jwt_cookies(response, access, refresh)
        return response

# ---------------------------------------------------------
#  REFRESH
# ---------------------------------------------------------
class RefreshView(CookieMixin, APIView):
    permission_classes = [AllowAny]  # ou custom JWT auth si tu veux

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({"detail": "No refresh token"}, status=401)

        try:
            refresh = RefreshToken(refresh_token)
            access = refresh.access_token
        except Exception:
            return Response({"detail": "Invalid refresh token"}, status=401)

        response = Response({"status": "refreshed"}, status=200)
        self.set_jwt_cookies(response, access, refresh)
        return response

# ---------------------------------------------------------
#  LOGOUT
# ---------------------------------------------------------
class LogoutView(CookieMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"status": "logged out"}, status=200)
        return self.clear_jwt_cookies(response)
