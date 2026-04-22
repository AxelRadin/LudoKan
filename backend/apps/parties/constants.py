"""
Constantes métier pour le cycle de vie des parties (recrutement, phases).

Les timeouts peuvent être surchargés via Django settings (objets timedelta) :
- PARTIES_OPEN_TIMEOUT
- PARTIES_READY_TIMEOUT
- PARTIES_READY_FOR_CHAT_TIMEOUT
- PARTIES_CHAT_COUNTDOWN
"""

from __future__ import annotations

from datetime import timedelta

from django.conf import settings

MIN_PLAYERS_TO_CONTINUE = 2

# Statuts de party considérés « non terminaux » (ex. `GET …/me/active`, filtres API).
NON_TERMINAL_PARTY_STATUS_VALUES = (
    "open",
    "waiting_ready",
    "waiting_ready_for_chat",
    "countdown",
    "chat_active",
)

# Si `Game.max_players` est absent ou invalide (None, 0, négatif), on utilise ce plafond
# pour la party. À ajuster côté produit si besoin ; documenté pour les appels API futurs.
DEFAULT_PARTY_MAX_PLAYERS = 4


def _party_timedelta(setting_name: str, default: timedelta) -> timedelta:
    value = getattr(settings, setting_name, default)
    if isinstance(value, timedelta):
        return value
    raise ValueError(f"{setting_name} must be a datetime.timedelta (got {type(value)!r})")


OPEN_TIMEOUT = _party_timedelta("PARTIES_OPEN_TIMEOUT", timedelta(minutes=5))
READY_TIMEOUT = _party_timedelta("PARTIES_READY_TIMEOUT", timedelta(minutes=2))
READY_FOR_CHAT_TIMEOUT = _party_timedelta("PARTIES_READY_FOR_CHAT_TIMEOUT", timedelta(minutes=2))
CHAT_COUNTDOWN = _party_timedelta("PARTIES_CHAT_COUNTDOWN", timedelta(seconds=30))

TIMED_OUT_LABEL = "Timed out"
