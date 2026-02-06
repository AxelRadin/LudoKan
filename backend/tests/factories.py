"""
Factories pour créer des objets de test avec Factory Boy
"""
import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory
from faker import Faker

fake = Faker()
User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory pour créer des utilisateurs de test"""

    class Meta:
        model = User

    pseudo = factory.Sequence(lambda n: f"user{n}")
    email = factory.LazyAttribute(lambda obj: f"{obj.pseudo}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True
    is_staff = False
    is_superuser = False

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        password = extracted or "defaultpass123"
        self.set_password(password)
        if create:
            self.save()


class AdminUserFactory(UserFactory):
    """Factory pour créer des administrateurs"""

    is_staff = True
    is_superuser = True


class GameFactory(DjangoModelFactory):
    """Factory pour créer des jeux de test"""

    class Meta:
        model = "games.Game"  # Sera défini quand le modèle sera créé

    title = factory.Faker("sentence", nb_words=3)
    description = factory.Faker("text", max_nb_chars=500)
    genre = factory.Faker("random_element", elements=["Strategy", "RPG", "Puzzle", "Action"])
    min_players = factory.Faker("random_int", min=1, max=2)
    max_players = factory.Faker("random_int", min=3, max=8)
    play_time = factory.Faker("random_int", min=15, max=180)
    complexity = factory.Faker("random_element", elements=["Low", "Medium", "High"])
    created_by = factory.SubFactory(UserFactory)


class GameSessionFactory(DjangoModelFactory):
    """Factory pour créer des sessions de jeu"""

    class Meta:
        model = "games.GameSession"  # Sera défini quand le modèle sera créé

    game = factory.SubFactory(GameFactory)
    host = factory.SubFactory(UserFactory)
    status = factory.Faker("random_element", elements=["waiting", "active", "finished"])
    max_players = factory.Faker("random_int", min=2, max=6)


class UserProfileFactory(DjangoModelFactory):
    """Factory pour créer des profils utilisateur"""

    class Meta:
        model = "users.UserProfile"  # Sera défini quand le modèle sera créé

    user = factory.SubFactory(UserFactory)
    bio = factory.Faker("text", max_nb_chars=200)
    favorite_genres = factory.Faker("random_elements", elements=["Strategy", "RPG", "Puzzle"], unique=True)
    experience_level = factory.Faker("random_element", elements=["Beginner", "Intermediate", "Advanced"])


class GameReviewFactory(DjangoModelFactory):
    """Factory pour créer des avis de jeux"""

    class Meta:
        model = "games.GameReview"  # Sera défini quand le modèle sera créé

    game = factory.SubFactory(GameFactory)
    user = factory.SubFactory(UserFactory)
    rating = factory.Faker("random_int", min=1, max=5)
    comment = factory.Faker("text", max_nb_chars=300)
    is_public = True


class FriendRequestFactory(DjangoModelFactory):
    """Factory pour créer des demandes d'ami"""

    class Meta:
        model = "social.FriendRequest"  # Sera défini quand le modèle sera créé

    from_user = factory.SubFactory(UserFactory)
    to_user = factory.SubFactory(UserFactory)
    status = factory.Faker("random_element", elements=["pending", "accepted", "declined"])


class GameRecommendationFactory(DjangoModelFactory):
    """Factory pour créer des recommandations de jeux"""

    class Meta:
        model = "recommendations.GameRecommendation"  # Sera défini quand le modèle sera créé

    user = factory.SubFactory(UserFactory)
    recommended_game = factory.SubFactory(GameFactory)
    confidence_score = factory.Faker("pyfloat", min_value=0.0, max_value=1.0)
    reason = factory.Faker("text", max_nb_chars=200)
