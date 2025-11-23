from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
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
            secure=not settings.DEBUG,
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
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = serializer.save()

        # Cas : email non encore vérifié (allauth)
        if not user.is_active:
            return Response(
                {
                    "success": True,
                    "pending_verification": True,
                    "user": UserSerializer(user).data,
                },
                status=status.HTTP_201_CREATED,
            )

        # Auto-login après inscription
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response(
            {"success": True, "user": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )
        self.set_jwt_cookies(response, access, refresh)
        return response


# ---------------------------------------------------------
#  LOGIN
# ---------------------------------------------------------
class LoginView(CookieMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # Ignorer cookies potentiellement corrompus
        request.COOKIES.pop("refresh_token", None)
        request.COOKIES.pop("access_token", None)

        email = request.data.get("email")
        password = request.data.get("password")

        # Avec un CustomUser dont USERNAME_FIELD = "email",
        # l'auth backend Django attend l'argument "username"
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({"detail": "Invalid credentials"}, status=400)

        if not user.is_active:
            return Response({"detail": "Email not verified"}, status=403)

        refresh = RefreshToken.for_user(user)
        access = refresh.access_token

        response = Response({"user": UserSerializer(user).data}, status=200)
        self.set_jwt_cookies(response, access, refresh)
        return response


# ---------------------------------------------------------
#  REFRESH
# ---------------------------------------------------------
class RefreshView(CookieMixin, APIView):
    permission_classes = [AllowAny]

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
        response.set_cookie(
            key=settings.JWT_AUTH_COOKIE,
            value=str(access),
            httponly=True,
            secure=not settings.DEBUG,
            samesite=settings.JWT_AUTH_SAMESITE,
            max_age=settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds(),
            path="/",
        )
        return response


# ---------------------------------------------------------
#  LOGOUT
# ---------------------------------------------------------
class LogoutView(CookieMixin, APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"status": "logged out"}, status=200)
        return self.clear_jwt_cookies(response)
