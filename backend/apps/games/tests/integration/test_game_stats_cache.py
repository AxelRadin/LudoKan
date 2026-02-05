import pytest
from django.test import override_settings
from rest_framework import status


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_game_stats_uses_cache(api_client, game):
    """
    Couvre la branche de GameStatsView qui renvoie directement les données en cache.
    """
    url = f"/api/games/{game.id}/stats/"

    # Premier appel : pas de cache, la vue calcule et stocke les données
    response1 = api_client.get(url)
    assert response1.status_code == status.HTTP_200_OK

    # Second appel : doit retourner les données directement depuis le cache
    response2 = api_client.get(url)
    assert response2.status_code == status.HTTP_200_OK
    assert response2.data == response1.data
