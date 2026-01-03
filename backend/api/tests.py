import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from .views import ItemViewSet

factory = APIRequestFactory()


@pytest.mark.django_db
def test_item_viewset_list_returns_ok_message(user):
    view = ItemViewSet.as_view({"get": "list"})
    request = factory.get("/items/")
    force_authenticate(request, user=user)

    response = view(request)

    assert response.status_code == 200
    assert response.data == {"message": "API is working"}


@pytest.mark.django_db
def test_item_viewset_create_returns_created_message(user):
    view = ItemViewSet.as_view({"post": "create"})
    request = factory.post("/items/", {"name": "test"}, format="json")
    force_authenticate(request, user=user)

    response = view(request)

    assert response.status_code == 200
    assert response.data == {"message": "Item created"}


@pytest.mark.django_db
def test_item_viewset_retrieve_returns_item_message(user):
    view = ItemViewSet.as_view({"get": "retrieve"})
    request = factory.get("/items/1/")
    force_authenticate(request, user=user)

    response = view(request, pk="1")

    assert response.status_code == 200
    assert response.data == {"message": "Item 1"}


@pytest.mark.django_db
def test_item_viewset_update_returns_updated_message(user):
    view = ItemViewSet.as_view({"put": "update"})
    request = factory.put("/items/1/", {"name": "updated"}, format="json")
    force_authenticate(request, user=user)

    response = view(request, pk="1")

    assert response.status_code == 200
    assert response.data == {"message": "Item 1 updated"}


@pytest.mark.django_db
def test_item_viewset_destroy_returns_deleted_message(user):
    view = ItemViewSet.as_view({"delete": "destroy"})
    request = factory.delete("/items/1/")
    force_authenticate(request, user=user)

    response = view(request, pk="1")

    assert response.status_code == 200
    assert response.data == {"message": "Item 1 deleted"}
