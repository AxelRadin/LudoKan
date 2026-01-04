import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def another_user(db):
    return User.objects.create_user(
        email="another_user@test.com",
        password="password123",
    )
