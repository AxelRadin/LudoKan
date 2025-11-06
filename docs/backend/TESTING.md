# 🧪 Guide de Tests pour LudoKan

## 📋 Vue d'ensemble

Ce guide explique comment utiliser et maintenir la suite de tests pour le projet LudoKan.

## 🏗️ Structure des tests

```
backend/
├── tests/                          # Tests globaux
│   ├── conftest.py                # Configuration pytest
│   ├── factories.py               # Factory Boy pour les données de test
│   ├── fixtures/                  # Fixtures JSON
│   └── test_celery_integration.py # Tests d'intégration Celery
├── apps/
│   ├── users/tests/               # Tests de l'app users
│   │   ├── test_models.py
│   │   ├── test_views.py
│   │   └── test_serializers.py
│   ├── games/tests/               # Tests de l'app games
│   │   ├── test_models.py
│   │   └── test_views.py
│   └── core/tests/                # Tests de l'app core
│       └── test_tasks.py
├── pytest.ini                    # Configuration pytest
└── run_tests.py                   # Script d'exécution des tests
```

## 🚀 Commandes de test

### Tests de base
```bash
# Exécuter tous les tests
python run_tests.py

# Tests avec couverture
python run_tests.py --coverage

# Tests en mode verbeux
python run_tests.py --verbose

# Tests en parallèle (plus rapide)
python run_tests.py --parallel 4
```

### Tests par catégorie
```bash
# Tests unitaires seulement
python run_tests.py --unit

# Tests d'intégration seulement
python run_tests.py --integration

# Tests Celery seulement
python run_tests.py --celery
```

### Tests par app
```bash
# Tests de l'app users
python run_tests.py --app users

# Tests de l'app games
python run_tests.py --app games

# Tests de l'app core
python run_tests.py --app core
```

### Commandes pytest directes
```bash
# Tests avec pytest directement
python -m pytest

# Tests avec couverture
python -m pytest --cov=apps --cov-report=html

# Tests d'un fichier spécifique
python -m pytest apps/users/tests/test_models.py

# Tests d'une fonction spécifique
python -m pytest apps/users/tests/test_models.py::TestUserModel::test_create_user
```

## 📊 Marqueurs de tests

Les tests sont organisés avec des marqueurs :

- `@pytest.mark.unit` : Tests unitaires
- `@pytest.mark.integration` : Tests d'intégration
- `@pytest.mark.api` : Tests d'API
- `@pytest.mark.celery` : Tests Celery
- `@pytest.mark.slow` : Tests lents

## 🔧 Fixtures disponibles

### Fixtures de base
- `user` : Utilisateur de test
- `admin_user` : Utilisateur administrateur
- `api_client` : Client API non authentifié
- `authenticated_api_client` : Client API authentifié
- `jwt_authenticated_client` : Client API avec JWT

### Fixtures de données
- `sample_game_data` : Données de jeu de test
- `sample_user_data` : Données utilisateur de test
- `mock_redis` : Mock Redis
- `mock_celery_task` : Mock tâches Celery

## 🏭 Factories

### Utilisation des factories
```python
from tests.factories import UserFactory, GameFactory

# Créer un utilisateur
user = UserFactory()

# Créer un utilisateur avec des données spécifiques
user = UserFactory(username='customuser', email='custom@example.com')

# Créer un jeu
game = GameFactory()

# Créer plusieurs utilisateurs
users = UserFactory.create_batch(5)
```

### Factories disponibles
- `UserFactory` : Utilisateurs
- `AdminUserFactory` : Administrateurs
- `GameFactory` : Jeux
- `GameSessionFactory` : Sessions de jeu
- `UserProfileFactory` : Profils utilisateur
- `GameReviewFactory` : Avis de jeux
- `FriendRequestFactory` : Demandes d'ami
- `GameRecommendationFactory` : Recommandations

## 🐳 Tests avec Docker

### Exécuter les tests dans Docker
```bash
# Tests dans le conteneur
docker compose exec web python run_tests.py

# Tests avec couverture
docker compose exec web python run_tests.py --coverage

# Tests Celery
docker compose exec web python run_tests.py --celery
```

### Tests d'intégration avec services
```bash
# Démarrer tous les services
docker compose up -d

# Exécuter les tests d'intégration
docker compose exec web python run_tests.py --integration
```

## 📈 Couverture de code

### Générer un rapport de couverture
```bash
python run_tests.py --coverage
```

Le rapport HTML sera généré dans `htmlcov/index.html`

### Objectif de couverture
- **Minimum** : 80% de couverture
- **Recommandé** : 90%+ de couverture
- **Critique** : 95%+ pour les modules critiques

## 🐛 Dépannage

### Problème : Tests qui échouent
```bash
# Exécuter avec plus de détails
python run_tests.py --verbose

# Exécuter un test spécifique
python -m pytest apps/users/tests/test_models.py::TestUserModel::test_create_user -v
```

### Problème : Base de données
```bash
# Nettoyer la base de données de test
python manage.py flush --settings=config.settings

# Recréer les migrations
python manage.py makemigrations
python manage.py migrate
```

### Problème : Celery
```bash
# Vérifier que Celery fonctionne
docker compose exec web python test_celery.py

# Vérifier les logs Celery
docker compose logs celery
```

## 📝 Bonnes pratiques

### 1. Nommage des tests
```python
def test_create_user_success(self):
    """Test de création d'utilisateur réussie"""
    pass

def test_create_user_invalid_email(self):
    """Test de création avec email invalide"""
    pass
```

### 2. Structure des tests
```python
@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        # Arrange
        user_data = {...}
        
        # Act
        user = User.objects.create(**user_data)
        
        # Assert
        assert user.username == user_data['username']
```

### 3. Utilisation des fixtures
```python
def test_user_profile(self, user, sample_user_data):
    # Utiliser les fixtures fournies
    pass
```

### 4. Tests d'API
```python
def test_api_endpoint(self, authenticated_api_client):
    response = authenticated_api_client.get('/api/users/')
    assert response.status_code == 200
```


## 📚 Ressources

- [Documentation pytest](https://docs.pytest.org/)
- [pytest-django](https://pytest-django.readthedocs.io/)
- [Factory Boy](https://factoryboy.readthedocs.io/)
- [Django Testing](https://docs.djangoproject.com/en/4.2/topics/testing/)
