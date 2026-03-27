"""
Tests pour le handler SystemLogHandler et la centralisation des logs (BACK-022A).
"""

import logging

import pytest

from apps.core.logging_handlers import SystemLogHandler, _event_type_from_record
from apps.core.models import SystemLog


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_handler_creates_entry():
    """Le handler SystemLogHandler crée une entrée SystemLog à chaque emit."""
    logger = logging.getLogger("test_system_log_handler_only")
    handler = SystemLogHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    try:
        logger.error("Test server error", extra={"request_path": "/api/foo"})
        assert SystemLog.objects.filter(event_type="server_error").exists()
        entry = SystemLog.objects.get(event_type="server_error")
        assert "Test server error" in entry.description
        assert entry.metadata.get("request_path") == "/api/foo"
    finally:
        logger.removeHandler(handler)


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_handler_uses_extra_event_type():
    """Si extra['event_type'] est fourni, il est utilisé."""
    logger = logging.getLogger("test_system_log_handler_event_type")
    handler = SystemLogHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    try:
        logger.info("Message", extra={"event_type": "api_fail"})
        assert SystemLog.objects.filter(event_type="api_fail").exists()
    finally:
        logger.removeHandler(handler)


@pytest.mark.unit
def test_event_type_from_record():
    """_event_type_from_record dérive le type depuis extra ou levelname."""
    record = logging.LogRecord("n", logging.ERROR, "", 0, "msg", (), None)
    assert _event_type_from_record(record) == "server_error"

    record.event_type = "custom"
    assert _event_type_from_record(record) == "custom"

    record = logging.LogRecord("n", logging.WARNING, "", 0, "msg", (), None)
    record.event_type = None
    assert _event_type_from_record(record) == "warning"

    record = logging.LogRecord("n", logging.INFO, "", 0, "msg", (), None)
    record.event_type = None
    assert _event_type_from_record(record) == "info"


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_handler_skips_user_in_metadata(user):
    """extra['user'] n'est pas mis dans metadata (branch key == 'user')."""
    logger = logging.getLogger("test_system_log_handler_user")
    handler = SystemLogHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    try:
        logger.info("With user", extra={"user": user, "other": 42})
        entry = SystemLog.objects.get(event_type="info")
        assert "user" not in entry.metadata
        assert entry.metadata.get("other") == 42
    finally:
        logger.removeHandler(handler)


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_handler_non_serializable_extra():
    """Extra avec valeur non (str/int/float/bool/list/dict) est converti en str (ligne 48)."""
    logger = logging.getLogger("test_system_log_handler_serialize")
    handler = SystemLogHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    try:
        logger.info("Msg", extra={"obj": object()})
        entry = SystemLog.objects.get(event_type="info")
        assert "obj" in entry.metadata
        assert isinstance(entry.metadata["obj"], str)
    finally:
        logger.removeHandler(handler)


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_handler_extra_str_raises_uses_placeholder():
    """Si str(value) lève, on met '<unserializable>' en metadata (ligne 49)."""

    class BadStr:
        def __str__(self):
            raise ValueError("nope")

    logger = logging.getLogger("test_system_log_handler_bad_str")
    handler = SystemLogHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    try:
        logger.info("Msg", extra={"bad": BadStr()})
        entry = SystemLog.objects.get(event_type="info")
        assert entry.metadata.get("bad") == "<unserializable>"
    finally:
        logger.removeHandler(handler)


@pytest.mark.django_db
@pytest.mark.unit
def test_system_log_handler_emit_handles_log_system_event_failure():
    """Si log_system_event lève, emit attrape et appelle handleError (lignes 62-63)."""
    from unittest.mock import patch

    logger = logging.getLogger("test_system_log_handler_fail")
    handler = SystemLogHandler()
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    try:
        with patch("apps.core.logging_utils.log_system_event", side_effect=RuntimeError("DB down")):
            logger.info("Boom")
        assert not SystemLog.objects.filter(description="Boom").exists()
    finally:
        logger.removeHandler(handler)
