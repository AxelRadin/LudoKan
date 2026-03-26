from unittest.mock import MagicMock, patch

from django.test import TestCase
from rest_framework.exceptions import APIException
from rest_framework.response import Response

from apps.core.models import SystemLog
from apps.users.exceptions import custom_exception_handler


class ExceptionHandlerTests(TestCase):
    def test_custom_exception_handler_standard(self):
        """Test standard error format"""
        exc = APIException("Standard error")
        context = {"request": MagicMock()}
        response = custom_exception_handler(exc, context)

        self.assertFalse(response.data["success"])
        self.assertIn("errors", response.data)

    def test_custom_exception_handler_x_forwarded_for(self):
        """Test X-Forwarded-For parsing for IP logging"""
        exc = APIException("Auth error")
        request = MagicMock()
        request.path = "/api/auth/login/"
        request.data = {"email": "test@example.com"}
        request.META = {"HTTP_X_FORWARDED_FOR": "10.0.0.1, 192.168.1.1", "REMOTE_ADDR": "127.0.0.1"}

        # Override response from DRF
        context = {"request": request}
        with patch("apps.users.exceptions.exception_handler") as mock_drf_handler:
            mock_drf_handler.return_value = Response({"detail": "Auth failed"}, status=400)
            custom_exception_handler(exc, context)

        log = SystemLog.objects.filter(event_type="login_failed").first()
        self.assertIsNotNone(log)
        self.assertIn("10.0.0.1", log.description)
        self.assertEqual(log.metadata.get("ip"), "10.0.0.1")

    def test_custom_exception_handler_csrf_error(self):
        """Test CSRF error specific logging"""
        exc = APIException("CSRF Failed: CSRF token missing or incorrect.")
        request = MagicMock()
        request.path = "/api/auth/login/"
        request.data = {"email": "csrf@example.com"}
        request.META = {"REMOTE_ADDR": "192.168.1.5"}

        context = {"request": request}
        with patch("apps.users.exceptions.exception_handler") as mock_drf_handler:
            mock_drf_handler.return_value = Response({"detail": "CSRF Failed"}, status=403)
            custom_exception_handler(exc, context)

        log = SystemLog.objects.filter(event_type="login_failed").first()
        self.assertIsNotNone(log)
        self.assertIn("CSRF error", log.description)
        self.assertEqual(log.metadata.get("email"), "csrf@example.com")

    def test_custom_exception_handler_logger_exception(self):
        """Test exception handling within the logger so it doesn't crash the API"""
        exc = APIException("Auth Error")
        request = MagicMock()
        request.path = "/api/auth/login/"
        request.META = {"REMOTE_ADDR": "127.0.0.1"}

        context = {"request": request}
        with patch("apps.users.exceptions.exception_handler") as mock_drf_handler:
            mock_drf_handler.return_value = Response({"detail": "Auth failed"}, status=401)
            with patch("apps.users.exceptions.log_system_event", side_effect=Exception("Database down!")):
                # Devrait ne pas crasher
                response = custom_exception_handler(exc, context)

        self.assertEqual(response.status_code, 401)
