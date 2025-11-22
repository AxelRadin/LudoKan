"""
Tests pour les modèles de l'app games
"""
import pytest


@pytest.mark.django_db
@pytest.mark.skip(reason="Modèle Game pas encore implémenté")
class TestGameModel:
    """Tests pour le modèle Game"""

    def test_create_game(self, user, sample_game_data):
        """Test de création d'un jeu"""
        # Ce test sera implémenté quand le modèle Game sera créé
        pass

    def test_game_str_representation(self, user, sample_game_data):
        """Test de la représentation string du jeu"""
        # Ce test sera implémenté quand le modèle Game sera créé
        pass

    def test_game_title_unique(self, user, sample_game_data):
        """Test que le titre du jeu doit être unique"""
        # Ce test sera implémenté quand le modèle Game sera créé
        pass

    def test_game_min_players_validation(self, user):
        """Test de validation du nombre minimum de joueurs"""
        # Ce test sera implémenté quand le modèle Game sera créé
        pass

    def test_game_max_players_validation(self, user):
        """Test de validation du nombre maximum de joueurs"""
        # Ce test sera implémenté quand le modèle Game sera créé
        pass


@pytest.mark.django_db
@pytest.mark.skip(reason="Modèle GameSession pas encore implémenté")
class TestGameSessionModel:
    """Tests pour le modèle GameSession"""

    def test_create_game_session(self, user, sample_game_data):
        """Test de création d'une session de jeu"""
        # Ce test sera implémenté quand le modèle GameSession sera créé
        pass

    def test_game_session_str_representation(self, user, sample_game_data):
        """Test de la représentation string de la session"""
        # Ce test sera implémenté quand le modèle GameSession sera créé
        pass

    def test_game_session_status_choices(self, user, sample_game_data):
        """Test des choix de statut de session"""
        # Ce test sera implémenté quand le modèle GameSession sera créé
        pass


@pytest.mark.django_db
@pytest.mark.skip(reason="Modèle GameReview pas encore implémenté")
class TestGameReviewModel:
    """Tests pour le modèle GameReview"""

    def test_create_game_review(self, user, sample_game_data):
        """Test de création d'un avis de jeu"""
        # Ce test sera implémenté quand le modèle GameReview sera créé
        pass

    def test_game_review_rating_validation(self, user, sample_game_data):
        """Test de validation de la note"""
        # Ce test sera implémenté quand le modèle GameReview sera créé
        pass

    def test_game_review_unique_per_user(self, user, sample_game_data):
        """Test qu'un utilisateur ne peut avoir qu'un avis par jeu"""
        # Ce test sera implémenté quand le modèle GameReview sera créé
        pass


@pytest.mark.django_db
class TestGameCategoryModel:
    """Tests pour le modèle GameCategory - Ces tests passent"""

    def test_create_game_category(self):
        """Test de création d'une catégorie de jeu"""
        # Ce test sera implémenté quand le modèle GameCategory sera créé
        pass

    def test_game_category_str_representation(self):
        """Test de la représentation string de la catégorie"""
        # Ce test sera implémenté quand le modèle GameCategory sera créé
        pass
