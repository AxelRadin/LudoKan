"""
Tests pour les modèles de l'app reviews
"""
import pytest
from django.core.exceptions import ValidationError

from apps.reviews.models import Review


@pytest.mark.django_db
class TestReviewModel:
    """Tests pour le modèle Review"""

    def test_create_review(self, user, game):
        """Création d'une review basique"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Ceci est un contenu de test valide pour la review.",
        )

        assert review.id is not None
        assert review.user == user
        assert review.game == game
        assert review.content == "Ceci est un contenu de test valide pour la review."
        assert review.date_created is not None
        assert review.date_modified is not None

    def test_create_review_with_rating(self, user, game, rating):
        """Création d'une review avec un rating"""
        review = Review.objects.create(
            user=user,
            game=game,
            rating=rating,
            content="Excellente review avec un rating de 8/10.",
        )

        assert review.rating == rating
        assert review.rating.value == 8

    def test_review_str(self, user, game):
        """__str__ doit renvoyer 'pseudo - game name'"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Contenu de test pour vérifier le __str__.",
        )

        assert str(review) == f"{user.pseudo} - {game.name}"

    def test_unique_user_game_review(self, user, game):
        """Un utilisateur ne peut laisser qu'une seule review par jeu"""
        Review.objects.create(
            user=user,
            game=game,
            content="Première review pour ce jeu.",
        )

        with pytest.raises(ValidationError):
            Review.objects.create(
                user=user,
                game=game,
                content="Tentative de deuxième review pour le même jeu.",
            )

    def test_multiple_users_can_review_same_game(self, user, user2, game):
        """Plusieurs utilisateurs peuvent laisser des reviews pour le même jeu"""
        review1 = Review.objects.create(
            user=user,
            game=game,
            content="Review de l'utilisateur 1.",
        )
        review2 = Review.objects.create(
            user=user2,
            game=game,
            content="Review de l'utilisateur 2.",
        )

        assert review1.id != review2.id
        assert Review.objects.filter(game=game).count() == 2

    def test_content_validation_too_short(self, user, game):
        """Le contenu doit faire au moins 4 caractères"""
        review = Review(
            user=user,
            game=game,
            content="nul",
        )

        with pytest.raises(ValidationError) as excinfo:
            review.save()

        assert "content" in excinfo.value.message_dict

    def test_content_validation_too_long(self, user, game):
        """Le contenu doit faire au maximum 500 caractères"""
        review = Review(
            user=user,
            game=game,
            content="A" * 501,
        )

        with pytest.raises(ValidationError) as excinfo:
            review.save()

        assert "content" in excinfo.value.message_dict

    def test_content_validation_valid_min_length(self, user, game):
        """Le contenu avec exactement 4 caractères est valide"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="A" * 4,
        )

        assert review.id is not None
        assert len(review.content) == 4

    def test_content_validation_valid_max_length(self, user, game):
        """Le contenu avec exactement 500 caractères est valide"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="B" * 500,
        )

        assert review.id is not None
        assert len(review.content) == 500

    def test_review_ordering(self, user, user2, game):
        """Les reviews doivent être ordonnées par date_created décroissant"""
        review1 = Review.objects.create(
            user=user,
            game=game,
            content="Première review créée.",
        )
        review2 = Review.objects.create(
            user=user2,
            game=game,
            content="Deuxième review créée.",
        )

        reviews = Review.objects.all()
        assert reviews[0] == review2
        assert reviews[1] == review1

    def test_review_cascade_on_user_delete(self, user, game):
        """La suppression d'un utilisateur supprime ses reviews"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Review qui sera supprimée avec l'utilisateur.",
        )
        review_id = review.id

        user.delete()

        assert not Review.objects.filter(id=review_id).exists()

    def test_review_cascade_on_game_delete(self, user, game):
        """La suppression d'un jeu supprime ses reviews"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Review qui sera supprimée avec le jeu.",
        )
        review_id = review.id

        game.delete()

        assert not Review.objects.filter(id=review_id).exists()

    def test_review_rating_set_null_on_rating_delete(self, user, game, rating):
        """La suppression d'un rating met le champ rating à NULL"""
        review = Review.objects.create(
            user=user,
            game=game,
            rating=rating,
            content="Review avec rating qui sera supprimé.",
        )

        rating.delete()
        review.refresh_from_db()

        assert review.rating is None

    def test_review_date_modified_auto_update(self, user, game):
        """Le champ date_modified doit se mettre à jour automatiquement"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Contenu initial de la review.",
        )
        initial_date_modified = review.date_modified

        review.content = "Contenu modifié de la review."
        review.save()

        assert review.date_modified > initial_date_modified

    def test_review_related_name_user(self, user, game):
        """Vérification du related_name 'reviews' depuis User"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Review pour tester le related_name.",
        )

        assert review in user.reviews.all()

    def test_review_related_name_game(self, user, game):
        """Vérification du related_name 'reviews' depuis Game"""
        review = Review.objects.create(
            user=user,
            game=game,
            content="Review pour tester le related_name du jeu.",
        )

        assert review in game.reviews.all()

    def test_review_related_name_rating(self, user, game, rating):
        """Vérification du related_name 'reviews' depuis Rating"""
        review = Review.objects.create(
            user=user,
            game=game,
            rating=rating,
            content="Review pour tester le related_name du rating.",
        )

        assert review in rating.reviews.all()
