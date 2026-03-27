from __future__ import annotations

from typing import Optional

from django.contrib.auth import get_user_model

from .models import AdminAction

UserModel = get_user_model()


def log_admin_action(
    *,
    admin_user: Optional[UserModel],
    action_type: str,
    target_type: str,
    target_id: Optional[int] = None,
    description: str = "",
) -> AdminAction:
    """
    Helper centralisé pour créer un log d'action administrateur.
    Enregistre aussi l'action dans system_logs

    Avantages :
    - Point unique pour ajuster le schéma / validation si besoin.
    - Garantit une nomenclature cohérente des actions.
    """
    action = AdminAction.objects.create(
        admin_user=admin_user,
        action_type=action_type,
        target_type=target_type,
        target_id=target_id,
        description=description,
    )
    # Centralisation des actions sensibles dans system_logs
    from apps.core.logging_utils import log_system_event

    log_system_event(
        event_type="admin_action",
        description=action_type,
        user=admin_user,
        metadata={
            "target_type": target_type,
            "target_id": target_id,
            "description": description[:500] if description else "",
        },
    )
    return action
