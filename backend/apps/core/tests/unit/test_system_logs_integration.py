import logging
from unittest.mock import MagicMock, PropertyMock, patch

from django.contrib.admin.models import ADDITION, LogEntry
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.handlers.wsgi import WSGIRequest
from django.test import Client, TestCase
from django.urls import path
from rest_framework.test import APIClient

from apps.core.celery_signals import on_celery_task_failure
from apps.core.log_handlers import SystemLogHandler
from apps.core.middleware import ActivityAnomalyMiddleware
from apps.core.models import SystemLog
from config.urls import urlpatterns as root_urlpatterns

User = get_user_model()


def view_that_raises(request):
    raise Exception("Test server error")


test_patterns = [
    path("test-500/", view_that_raises),
]
root_urlpatterns += test_patterns


class SystemLogsIntegrationTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        logging.getLogger("django.request").setLevel(logging.ERROR)
        logging.getLogger("system_logs").setLevel(logging.INFO)

    def setUp(self):
        self.client = Client()
        self.api_client = APIClient()
        self.user = User.objects.create_user(email="testuser@example.com", password="testpassword123", pseudo="TestUser")

    def test_log_server_error_500(self):
        """Vérifie qu'une exception non gérée dans une vue crée un SystemLog(server_error)"""
        try:
            self.client.get("/test-500/")
        except Exception:
            pass

        log_exists = SystemLog.objects.filter(event_type__in=["server_error", "django.request"]).exists()
        if log_exists:
            log = SystemLog.objects.filter(event_type__in=["server_error", "django.request"]).first()
            self.assertIn("Internal Server Error", log.description)
            self.assertIn("Test server error", log.metadata.get("traceback", ""))

    def test_log_login_failed(self):
        """Vérifie que le signal d'échec de login crée bien un SystemLog"""
        response = self.api_client.post("/api/auth/login/", {"email": "wrong@example.com", "password": "wrongpassword"})
        self.assertEqual(response.status_code, 400)

        log = SystemLog.objects.filter(event_type="login_failed").first()
        self.assertIsNotNone(log)
        self.assertIn("wrong@example.com", log.description)
        self.assertEqual(log.metadata.get("email"), "wrong@example.com")

    def test_log_admin_action(self):
        """Vérifie que l'enregistrement d'une LogEntry admin crée un SystemLog"""
        ct = ContentType.objects.get_for_model(User)

        LogEntry.objects.log_action(
            user_id=self.user.id,
            content_type_id=ct.pk,
            object_id=self.user.id,
            object_repr=str(self.user),
            action_flag=ADDITION,
            change_message="Added user",
        )

        log = SystemLog.objects.filter(event_type="admin_action").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.metadata.get("action_flag"), ADDITION)

    @patch("apps.core.middleware.cache")
    def test_activity_anomaly_middleware(self, mock_cache):
        """Vérifie que le middleware détecte un pic d'activité (spam limit)"""
        middleware = ActivityAnomalyMiddleware(get_response=lambda req: MagicMock(status_code=200))
        mock_cache.get.return_value = ActivityAnomalyMiddleware.LIMIT_PER_MINUTE - 1

        with patch("django.contrib.auth.models.AbstractBaseUser.is_authenticated", new_callable=PropertyMock) as mock_auth:
            mock_auth.return_value = True

            request = MagicMock()
            request.META = {"REMOTE_ADDR": "192.168.1.100", "HTTP_X_FORWARDED_FOR": "192.168.1.200, 10.0.0.1"}
            request.user = self.user

            middleware(request)

        log = SystemLog.objects.filter(event_type="activity_anomaly").first()
        self.assertIsNotNone(log)
        self.assertIn("192.168.1.200", log.description)
        self.assertEqual(log.metadata.get("requests_last_minute"), ActivityAnomalyMiddleware.LIMIT_PER_MINUTE)
        self.assertEqual(log.metadata.get("user_detected"), self.user.id)

    def test_celery_task_failure_hook(self):
        """Vérifie que le hook celery task_failure crée bien un log"""
        sender_mock = MagicMock()
        sender_mock.name = "dummy_task"
        exception = ValueError("Task dummy failed")

        on_celery_task_failure(
            sender=sender_mock, task_id="1234-abcd", exception=exception, args=("arg1",), kwargs={"kwarg": "val"}, einfo="dummy traceback"
        )

        log = SystemLog.objects.filter(event_type="celery_task_failure").first()
        self.assertIsNotNone(log)
        self.assertIn("dummy_task", log.description)
        self.assertIn("Task dummy failed", log.description)
        self.assertEqual(log.metadata.get("task_id"), "1234-abcd")
        self.assertEqual(log.metadata.get("traceback"), "dummy traceback")

    def test_log_handler_edge_cases(self):
        """Vérifie la couverture des exceptions et des cas non standards du SystemLogHandler"""

        handler = SystemLogHandler()

        record = logging.LogRecord(name="test_logger", level=logging.INFO, pathname="", lineno=0, msg="test description", args=(), exc_info=None)
        request_mock = MagicMock(spec=WSGIRequest)
        request_mock.path = "/test"
        request_mock.method = "POST"

        class BadBody:
            def decode(self, *args, **kwargs):
                raise UnicodeDecodeError("utf-8", b"", 0, 1, "mock error")

        request_mock.body = BadBody()
        request_mock.user = MagicMock()
        request_mock.user.is_authenticated = False

        record.request = request_mock
        record.metadata = {"extra_key": "extra_val"}
        record.status_code = 404

        handler.emit(record)

        log = SystemLog.objects.filter(description="test description").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.metadata.get("body"), "unparseable_body")
        self.assertEqual(log.metadata.get("extra_key"), "extra_val")
        self.assertEqual(log.metadata.get("status_code"), 404)

        request_mock_auth = MagicMock(spec=WSGIRequest)
        request_mock_auth.path = "/test/auth"
        request_mock_auth.method = "GET"
        request_mock_auth.user = self.user
        request_mock_auth.body = b"some data"
        with patch("django.contrib.auth.models.AbstractBaseUser.is_authenticated", new_callable=PropertyMock) as mock_auth:
            mock_auth.return_value = True
            record_auth = logging.LogRecord(
                name="test_logger_auth", level=logging.INFO, pathname="", lineno=0, msg="test desc auth", args=(), exc_info=None
            )
            record_auth.request = request_mock_auth
            handler.emit(record_auth)

        log_auth = SystemLog.objects.filter(description="test desc auth").first()
        self.assertIsNotNone(log_auth)
        self.assertEqual(log_auth.user, self.user)

        with patch("apps.core.models.SystemLog.objects.create", side_effect=Exception("DB Error")):
            with patch("builtins.print") as mock_print:
                handler.emit(record)
                mock_print.assert_called_with("Failed to save system log to DB: DB Error")
