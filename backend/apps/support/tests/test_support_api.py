import pytest
from rest_framework import status
from rest_framework.test import APIClient

from apps.support.models import SupportTicket
from apps.users.models import UserRole


@pytest.mark.django_db
def test_user_create_and_list_support_ticket(authenticated_api_client, user):
    payload = {
        "category": "bug",
        "subject": "Problème affichage",
        "body": "Description détaillée du bug rencontré sur le site.",
    }
    r = authenticated_api_client.post("/api/support/tickets/", payload, format="json")
    assert r.status_code == status.HTTP_201_CREATED
    assert r.data["subject"] == payload["subject"]

    r2 = authenticated_api_client.get("/api/support/tickets/")
    assert r2.status_code == status.HTTP_200_OK
    assert len(r2.data) == 1
    assert r2.data[0]["id"] == r.data["id"]


@pytest.mark.django_db
def test_user_cannot_see_other_users_ticket(authenticated_api_client, user, django_user_model):
    other = django_user_model.objects.create_user(
        email="other@example.com",
        password="pass12345!",
        pseudo="otheruser",
    )
    t = SupportTicket.objects.create(
        user=other,
        category=SupportTicket.Category.OTHER,
        subject="Privé",
        body="Message privé assez long pour la validation.",
    )
    r = authenticated_api_client.get(f"/api/support/tickets/{t.pk}/")
    assert r.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_admin_list_and_patch_support_ticket(user, django_user_model):
    staff = django_user_model.objects.create_user(
        email="staff@example.com",
        password="pass12345!",
        pseudo="staffuser",
    )
    UserRole.objects.create(user=staff, role=UserRole.Role.ADMIN)

    SupportTicket.objects.create(
        user=user,
        category=SupportTicket.Category.ACCOUNT,
        subject="Compte bloqué",
        body="Je ne peux plus me connecter depuis hier soir.",
    )

    client = APIClient()
    client.force_authenticate(user=staff)

    r = client.get("/api/admin/support/tickets/")
    assert r.status_code == status.HTTP_200_OK
    assert r.data["count"] >= 1
    tid = r.data["results"][0]["id"]

    r2 = client.patch(
        f"/api/admin/support/tickets/{tid}/",
        {"status": SupportTicket.Status.IN_PROGRESS, "internal_note": "Pris en charge"},
        format="json",
    )
    assert r2.status_code == status.HTTP_200_OK
    assert r2.data["status"] == SupportTicket.Status.IN_PROGRESS
    assert r2.data["internal_note"] == "Pris en charge"


@pytest.mark.django_db
def test_support_ticket_str(user):
    t = SupportTicket.objects.create(
        user=user,
        category=SupportTicket.Category.BUG,
        subject="Very long subject for a bug report that will be truncated",
        body="This is a test body.",
    )
    assert str(t) == f"#{t.pk} Very long subject for a bug report th"


@pytest.mark.django_db
def test_support_ticket_validations(authenticated_api_client):
    payload = {
        "category": "bug",
        "subject": "ab",
        "body": "Description détaillée.",
    }
    r = authenticated_api_client.post("/api/support/tickets/", payload, format="json")
    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert "subject" in r.data

    payload2 = {
        "category": "bug",
        "subject": "Problème affichage",
        "body": "court",
    }
    r2 = authenticated_api_client.post("/api/support/tickets/", payload2, format="json")
    assert r2.status_code == status.HTTP_400_BAD_REQUEST
    assert "body" in r2.data


@pytest.mark.django_db
def test_admin_update_ticket_invalid_status(user, django_user_model):
    staff = django_user_model.objects.create_user(
        email="staff2@example.com",
        password="pass12345!",
        pseudo="staffuser2",
    )
    UserRole.objects.create(user=staff, role=UserRole.Role.ADMIN)

    t = SupportTicket.objects.create(
        user=user,
        category=SupportTicket.Category.ACCOUNT,
        subject="Compte",
        body="Body of the ticket here",
    )

    client = APIClient()
    client.force_authenticate(user=staff)

    r = client.patch(
        f"/api/admin/support/tickets/{t.pk}/",
        {"status": "invalid_status"},
        format="json",
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST
    assert "status" in r.data


@pytest.mark.django_db
def test_admin_support_tickets_filters_and_get(user, django_user_model):
    staff = django_user_model.objects.create_user(
        email="staff3@example.com",
        password="pass12345!",
        pseudo="staffuser3",
    )
    UserRole.objects.create(user=staff, role=UserRole.Role.ADMIN)

    t = SupportTicket.objects.create(
        user=user,
        category=SupportTicket.Category.ACCOUNT,
        subject="Problème de compte email",
        body="Body of the ticket here",
        status=SupportTicket.Status.OPEN,
    )

    client = APIClient()
    client.force_authenticate(user=staff)

    r_detail = client.get(f"/api/admin/support/tickets/{t.pk}/")
    assert r_detail.status_code == status.HTTP_200_OK
    assert r_detail.data["subject"] == "Problème de compte email"

    r_put = client.put(f"/api/admin/support/tickets/{t.pk}/", {"subject": "Test"})
    assert r_put.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

    r_status = client.get("/api/admin/support/tickets/?status=open")
    assert r_status.data["count"] >= 1

    r_cat = client.get("/api/admin/support/tickets/?category=account")
    assert r_cat.data["count"] >= 1

    r_search = client.get("/api/admin/support/tickets/?search=email")
    assert r_search.data["count"] >= 1
