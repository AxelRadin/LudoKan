"""Petits helpers partagés entre modules de services (évite les imports croisés lifecycle ↔ chat)."""

from __future__ import annotations

from apps.parties.models import GameParty


def cancel_party(party: GameParty, *, clear_countdown: bool = False) -> None:
    """Passe la party en `cancelled`, optionnellement en effaçant les horodatages du countdown."""
    party.status = GameParty.Status.CANCELLED
    update_fields = ["status", "updated_at"]
    if clear_countdown:
        party.countdown_started_at = None
        party.countdown_ends_at = None
        update_fields.extend(["countdown_started_at", "countdown_ends_at"])
    party.save(update_fields=update_fields)
