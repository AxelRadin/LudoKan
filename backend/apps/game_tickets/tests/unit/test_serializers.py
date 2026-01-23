import pytest
from rest_framework.test import APIRequestFactory

from apps.game_tickets.models import GameTicket
from apps.game_tickets.serializers import GameTicketCreateSerializer


@pytest.mark.django_db
def test_validate_game_name_too_short(user):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "A"},
        context={"request": request},
    )
    assert serializer.is_valid() is False
    assert "game_name" in serializer.errors


@pytest.mark.django_db
def test_validate_year_out_of_range(user):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "Valid Name", "year": 1800},
        context={"request": request},
    )
    assert serializer.is_valid() is False
    assert "year" in serializer.errors


@pytest.mark.django_db
def test_validate_age_negative(user):
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "Valid Name", "age": -5},
        context={"request": request},
    )
    assert serializer.is_valid() is False
    assert "age" in serializer.errors


@pytest.mark.django_db
def test_validate_age_negative_drf_message(user):
    """Teste le message d'erreur DRF pour un âge négatif."""
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "Valid Name", "age": -5},
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "age" in serializer.errors
    assert serializer.errors["age"][0] == "Ensure this value is greater than or equal to 0."


@pytest.mark.django_db
def test_validate_duplicate_ticket(user):
    """Teste qu'un doublon déclenche une erreur non_field_errors."""
    GameTicket.objects.create(user=user, game_name="Duplicate Game")

    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "Duplicate Game"},
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "non_field_errors" in serializer.errors


@pytest.mark.django_db
def test_valid_game_ticket(user, genre, platform):
    """Teste la création valide d'un ticket avec genres et plateformes."""
    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={
            "game_name": "Valid Game",
            "year": 2025,
            "age": 12,
            "genres": [genre.id],
            "platforms": [platform.id],
        },
        context={"request": request},
    )

    assert serializer.is_valid() is True
    validated_data = serializer.validated_data
    assert validated_data["game_name"] == "Valid Game"


@pytest.mark.django_db
def test_duplicate_ticket_triggers_validate(user):
    """Teste qu'un ticket en double déclenche une erreur."""
    GameTicket.objects.create(user=user, game_name="Duplicate Game")

    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "Duplicate Game"},
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "non_field_errors" in serializer.errors


@pytest.mark.django_db
def test_validate_duplicate_game_ticket_triggers_validate(user):
    """Teste qu'un doublon déclenche une erreur même si d'autres champs sont valides."""
    GameTicket.objects.create(user=user, game_name="Existing Game")

    factory = APIRequestFactory()
    request = factory.post("/")
    request.user = user

    serializer = GameTicketCreateSerializer(
        data={"game_name": "Existing Game", "year": 2025, "age": 12},
        context={"request": request},
    )

    assert serializer.is_valid() is False
    assert "non_field_errors" in serializer.errors
