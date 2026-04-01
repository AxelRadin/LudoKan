"""
Tests pour le handler d'exceptions custom (BACK-022A : log 5xx dans system_logs).
"""

from unittest.mock import MagicMock, patch

import pytest
from rest_framework.response import Response

from apps.core.models import SystemLog
from apps.users.exceptions import custom_exception_handler


@pytest.mark.django_db
@pytest.mark.unit
def test_exception_handler_logs_500_to_system_logs():
    """Quand exception_handler renvoie une réponse 5xx, on log dans system_logs (ligne 22)."""
    exc = Exception("Internal server error")
    context = {"view": MagicMock(), "request": MagicMock()}
    context["request"].path = "/api/foo/"

    with patch("apps.users.exceptions.exception_handler") as mock_drf_handler:
        mock_drf_handler.return_value = Response({"detail": "Error"}, status=500)
        response = custom_exception_handler(exc, context)

    assert response is not None
    assert SystemLog.objects.filter(event_type="api_fail").exists()
    entry = SystemLog.objects.get(event_type="api_fail")
    assert "Internal server error" in entry.description
    assert entry.metadata.get("status_code") == 500
    assert entry.metadata.get("request_path") == "/api/foo/"
