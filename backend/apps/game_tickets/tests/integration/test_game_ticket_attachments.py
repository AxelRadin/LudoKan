import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.game_tickets.models import GameTicket, GameTicketAttachment


@pytest.mark.django_db
def test_upload_attachment_authenticated(authenticated_api_client, user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    uploaded_file = SimpleUploadedFile(
        "test.png",
        b"fake image content",
        content_type="image/png",
    )

    url = f"/api/game-tickets/{ticket.id}/attachments/"
    response = authenticated_api_client.post(
        url,
        {"file": uploaded_file},
        format="multipart",
    )

    assert response.status_code == status.HTTP_201_CREATED

    attachment = GameTicketAttachment.objects.get(pk=response.data["id"])
    assert attachment.ticket == ticket
    assert attachment.file.name.startswith("game_tickets/attachments/")
    assert attachment.file.name.endswith(".png")


@pytest.mark.django_db
def test_upload_attachment_unauthenticated(api_client, user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    uploaded_file = SimpleUploadedFile(
        "test.png",
        b"fake image content",
        content_type="image/png",
    )

    url = f"/api/game-tickets/{ticket.id}/attachments/"
    response = api_client.post(
        url,
        {"file": uploaded_file},
        format="multipart",
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_upload_attachment_forbidden(authenticated_api_client, user, another_user):
    ticket = GameTicket.objects.create(
        user=another_user,
        game_name="Other Game",
    )

    uploaded_file = SimpleUploadedFile(
        "test.png",
        b"fake image content",
        content_type="image/png",
    )

    url = f"/api/game-tickets/{ticket.id}/attachments/"
    response = authenticated_api_client.post(
        url,
        {"file": uploaded_file},
        format="multipart",
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_upload_attachment_invalid_format(authenticated_api_client, user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    uploaded_file = SimpleUploadedFile(
        "bad_file.txt",
        b"some content",
        content_type="text/plain",
    )

    url = f"/api/game-tickets/{ticket.id}/attachments/"
    response = authenticated_api_client.post(
        url,
        {"file": uploaded_file},
        format="multipart",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["success"] is False
    assert "file" in response.data["errors"]
    assert "Unsupported file format" in response.data["errors"]["file"][0]


@pytest.mark.django_db
def test_upload_attachment_too_large(authenticated_api_client, user):
    ticket = GameTicket.objects.create(user=user, game_name="Test Game")

    uploaded_file = SimpleUploadedFile(
        "big_image.png",
        b"a" * 6 * 1024 * 1024,  # 6MB
        content_type="image/png",
    )

    url = f"/api/game-tickets/{ticket.id}/attachments/"
    response = authenticated_api_client.post(
        url,
        {"file": uploaded_file},
        format="multipart",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["success"] is False
    assert "file" in response.data["errors"]
    assert "File too large" in response.data["errors"]["file"][0]
