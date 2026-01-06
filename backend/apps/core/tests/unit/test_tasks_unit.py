from unittest import mock

from apps.core import tasks


def test_send_welcome_email_success(monkeypatch, settings):
    sent_calls = {}

    def fake_send_mail(subject, message, from_email, recipient_list, fail_silently):
        sent_calls["subject"] = subject
        sent_calls["message"] = message
        sent_calls["from_email"] = from_email
        sent_calls["recipient_list"] = recipient_list
        sent_calls["fail_silently"] = fail_silently
        return 1

    monkeypatch.setattr(tasks, "send_mail", fake_send_mail)

    result = tasks.send_welcome_email("user@example.com", "TestUser")

    assert result == "Email envoyé à user@example.com"
    assert sent_calls["subject"] == "Bienvenue sur LudoKan!"
    assert "Bonjour TestUser" in sent_calls["message"]
    assert sent_calls["from_email"] == settings.DEFAULT_FROM_EMAIL
    assert sent_calls["recipient_list"] == ["user@example.com"]
    assert sent_calls["fail_silently"] is False


def test_send_welcome_email_failure(monkeypatch):
    def fake_send_mail(*args, **kwargs):
        raise Exception("SMTP Error")

    monkeypatch.setattr(tasks, "send_mail", fake_send_mail)

    result = tasks.send_welcome_email("user@example.com", "TestUser")

    assert "Erreur lors de l'envoi" in result


def test_process_game_data_returns_expected_message(monkeypatch):
    sleep_calls = {}

    def fake_sleep(seconds):
        sleep_calls["seconds"] = seconds

    monkeypatch.setattr(tasks.time, "sleep", fake_sleep)

    result = tasks.process_game_data(42)

    assert result == "Données du jeu 42 traitées avec succès"
    assert sleep_calls["seconds"] == 5


def test_cleanup_old_sessions_deletes_expired_sessions(monkeypatch):
    mock_session_manager = mock.Mock()
    mock_queryset = mock.Mock()
    mock_queryset.count.return_value = 3
    mock_session_manager.objects.filter.return_value = mock_queryset

    monkeypatch.setattr("django.contrib.sessions.models.Session", mock_session_manager)

    result = tasks.cleanup_old_sessions()

    mock_session_manager.objects.filter.assert_called_once()
    mock_queryset.delete.assert_called_once()
    assert result == "3 sessions expirées supprimées"


def test_generate_user_statistics_returns_expected_message(monkeypatch):
    sleep_calls = {}

    def fake_sleep(seconds):
        sleep_calls["seconds"] = seconds

    monkeypatch.setattr(tasks.time, "sleep", fake_sleep)

    result = tasks.generate_user_statistics(99)

    assert result == "Statistiques générées pour l'utilisateur 99"
    assert sleep_calls["seconds"] == 3
