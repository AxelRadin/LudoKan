"""
Tests pour les modèles de l'app users
"""
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests pour le modèle User"""
    
    def test_create_user(self):
        """Test de création d'un utilisateur normal"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        assert user.username == 'testuser'
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.is_active is True
        assert user.is_staff is False
        assert user.is_superuser is False
    
    def test_create_superuser(self):
        """Test de création d'un superutilisateur"""
        user = User.objects.create_superuser(
            username='admin',
            email='admin@example.com',
            password='adminpass123'
        )
        
        assert user.is_staff is True
        assert user.is_superuser is True
    
    def test_user_str_representation(self):
        """Test de la représentation string de l'utilisateur"""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        
        assert str(user) == 'testuser'
    
    @pytest.mark.skip(reason="Django User par défaut n'impose pas l'unicité de l'email")
    def test_user_email_unique(self):
        """Test que l'email doit être unique"""
        User.objects.create_user(
            username='user1',
            email='test@example.com'
        )
        
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                username='user2',
                email='test@example.com'
            )
    
    def test_user_username_unique(self):
        """Test que le nom d'utilisateur doit être unique"""
        User.objects.create_user(
            username='testuser',
            email='test1@example.com'
        )
        
        with pytest.raises(IntegrityError):
            User.objects.create_user(
                username='testuser',
                email='test2@example.com'
            )


@pytest.mark.django_db
@pytest.mark.skip(reason="Modèle UserProfile pas encore implémenté")
class TestUserProfileModel:
    """Tests pour le modèle UserProfile (quand il sera créé)"""
    
    def test_user_profile_creation(self, user):
        """Test de création d'un profil utilisateur"""
        # Ce test sera implémenté quand le modèle UserProfile sera créé
        pass
    
    def test_user_profile_str_representation(self, user):
        """Test de la représentation string du profil"""
        # Ce test sera implémenté quand le modèle UserProfile sera créé
        pass


@pytest.mark.django_db
@pytest.mark.skip(reason="Modèle UserPreferences pas encore implémenté")
class TestUserPreferencesModel:
    """Tests pour le modèle UserPreferences (quand il sera créé)"""
    
    def test_user_preferences_creation(self, user):
        """Test de création des préférences utilisateur"""
        # Ce test sera implémenté quand le modèle UserPreferences sera créé
        pass
