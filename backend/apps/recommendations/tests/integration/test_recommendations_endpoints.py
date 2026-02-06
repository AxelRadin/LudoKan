"""
Tests d'intégration de base pour l'app recommendations.

"""

import pytest
from rest_framework import status


@pytest.mark.django_db
@pytest.mark.skip(reason="Endpoints recommendations à définir/implémenter")
class TestRecommendationsEndpoints:
    def test_placeholder(self, api_client):
        """Exemple de test d'endpoint recommendations (à implémenter plus tard)."""
        response = api_client.get("/api/recommendations/")
        assert response.status_code in {status.HTTP_200_OK, status.HTTP_404_NOT_FOUND}
