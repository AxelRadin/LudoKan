import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def another_user(db):
    return User.objects.create_user(email="another_user@test.com", password="password123", pseudo="anotheruser")


@pytest.fixture
def authenticated_staff_api_client(api_client, django_user_model):
    user = django_user_model.objects.create_user(
        email="staff@test.com",
        password="password",
        is_staff=True,
    )
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def ticket(user):
    from apps.game_tickets.models import GameTicket

    return GameTicket.objects.create(user=user, game_name="Test Ticket")


@pytest.fixture
def staff_api_client(db):
    user = User.objects.create_user(email="staff@test.com", password="password123", is_staff=True)
    client = APIClient()
    client.force_authenticate(user=user)
    return client
