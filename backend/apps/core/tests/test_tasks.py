"""
Tests pour les tâches Celery de l'app core
"""
from unittest.mock import patch

import pytest

from apps.core.tasks import cleanup_old_sessions, generate_user_statistics, process_game_data, send_welcome_email


@pytest.mark.celery
@pytest.mark.skip(reason="Mock Celery non configuré correctement pour ces tests")
class TestSendWelcomeEmailTask:
    """Tests pour la tâche d'envoi d'email de bienvenue"""

    def test_send_welcome_email_success(self, mock_celery_task):
        """Test d'envoi d'email réussi"""
        with patch("apps.core.tasks.send_mail") as mock_send_mail:
            mock_send_mail.return_value = True

            result = send_welcome_email.delay("test@example.com", "TestUser")

            assert result.id is not None
            mock_send_mail.assert_called_once_with(
                "Bienvenue sur LudoKan!",
                "Bonjour TestUser, bienvenue sur notre plateforme!",
                "noreply@ludokan.com",
                ["test@example.com"],
                fail_silently=False,
            )

    def test_send_welcome_email_failure(self, mock_celery_task):
        """Test d'envoi d'email en cas d'erreur"""
        with patch("apps.core.tasks.send_mail") as mock_send_mail:
            mock_send_mail.side_effect = Exception("SMTP Error")

            result = send_welcome_email.delay("test@example.com", "TestUser")

            assert "Erreur lors de l'envoi" in result.get()


@pytest.mark.celery
@pytest.mark.skip(reason="Tests Celery désactivés temporairement - Worker Celery non démarré")
class TestProcessGameDataTask:
    """Tests pour la tâche de traitement de données de jeu"""

    def test_process_game_data_success(self, mock_celery_task):
        """Test de traitement de données réussi"""
        result = process_game_data.delay(123)

        assert result.id is not None
        assert "Données du jeu 123 traitées avec succès" in result.get()

    def test_process_game_data_with_different_id(self, mock_celery_task):
        """Test de traitement avec différents IDs de jeu"""
        result = process_game_data.delay(456)

        assert result.id is not None
        assert "Données du jeu 456 traitées avec succès" in result.get()


@pytest.mark.celery
@pytest.mark.skip(reason="Mock Django Session non configuré correctement")
class TestCleanupOldSessionsTask:
    """Tests pour la tâche de nettoyage des sessions"""

    def test_cleanup_old_sessions_success(self, mock_celery_task):
        """Test de nettoyage des sessions réussi"""
        with patch("apps.core.tasks.Session") as mock_session:
            mock_session.objects.filter.return_value.count.return_value = 5
            mock_session.objects.filter.return_value.delete.return_value = (
                5,
                {"sessions.Session": 5},
            )

            result = cleanup_old_sessions.delay()

            assert result.id is not None
            assert "5 sessions expirées supprimées" in result.get()

    def test_cleanup_old_sessions_no_sessions(self, mock_celery_task):
        """Test de nettoyage quand il n'y a pas de sessions expirées"""
        with patch("apps.core.tasks.Session") as mock_session:
            mock_session.objects.filter.return_value.count.return_value = 0
            mock_session.objects.filter.return_value.delete.return_value = (0, {})

            result = cleanup_old_sessions.delay()

            assert result.id is not None
            assert "0 sessions expirées supprimées" in result.get()


@pytest.mark.celery
@pytest.mark.skip(reason="Tests Celery désactivés temporairement - Worker Celery non démarré")
class TestGenerateUserStatisticsTask:
    """Tests pour la tâche de génération de statistiques utilisateur"""

    def test_generate_user_statistics_success(self, mock_celery_task):
        """Test de génération de statistiques réussi"""
        result = generate_user_statistics.delay(123)

        assert result.id is not None
        assert "Statistiques générées pour l'utilisateur 123" in result.get()

    def test_generate_user_statistics_with_different_user(self, mock_celery_task):
        """Test de génération avec différents utilisateurs"""
        result = generate_user_statistics.delay(456)

        assert result.id is not None
        assert "Statistiques générées pour l'utilisateur 456" in result.get()


@pytest.mark.celery
@pytest.mark.skip(reason="Tests Celery désactivés temporairement - Worker Celery non démarré")
class TestTaskIntegration:
    """Tests d'intégration des tâches"""

    def test_task_chain(self, mock_celery_task):
        """Test d'enchaînement de tâches"""
        # Ce test sera implémenté quand on aura des tâches enchaînées
        pass

    def test_task_retry_mechanism(self, mock_celery_task):
        """Test du mécanisme de retry des tâches"""
        # Ce test sera implémenté quand on aura des tâches avec retry
        pass

    def test_task_error_handling(self, mock_celery_task):
        """Test de gestion d'erreurs des tâches"""
        # Ce test sera implémenté quand on aura des tâches avec gestion d'erreurs
        pass
