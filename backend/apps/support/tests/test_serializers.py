import pytest
from rest_framework import serializers

from apps.support.models import SupportTicket
from apps.support.serializers import SupportTicketAdminUpdateSerializer


@pytest.mark.unit
def test_support_ticket_admin_update_serializer_validate_status_manual():
    """
    Test direct du validateur pour couvrir la ligne de code,
    car en intégration c'est le ChoiceField qui intercepte l'erreur en premier.
    """
    serializer = SupportTicketAdminUpdateSerializer()

    # Test invalide pour la couverture de la ligne 98
    with pytest.raises(serializers.ValidationError) as exc:
        serializer.validate_status("invalid_status_value")
    assert str(exc.value.detail[0]) == "Statut invalide."

    # Test valide
    valid_status = SupportTicket.Status.OPEN
    assert serializer.validate_status(valid_status) == valid_status
