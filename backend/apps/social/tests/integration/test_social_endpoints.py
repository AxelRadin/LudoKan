"""
Tests d'intégration de base pour l'app social.

"""

import pytest
from rest_framework import status


@pytest.mark.django_db
@pytest.mark.skip(reason="Endpoints social à définir/implémenter")
class TestSocialEndpoints:
    def test_placeholder(self, api_client):
        """Exemple de test d'endpoint social (à implémenter plus tard)."""
        response = api_client.get("/api/social/")
        assert response.status_code in {status.HTTP_200_OK, status.HTTP_404_NOT_FOUND}
