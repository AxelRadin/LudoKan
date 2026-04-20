"""Tests des constantes de durée (`apps.parties.constants`) et validation des settings."""

from __future__ import annotations

import importlib

import pytest
from django.test import override_settings


def test_constants_rejects_non_timedelta_party_setting():
    import apps.parties.constants as constants_mod

    with override_settings(PARTIES_OPEN_TIMEOUT="not-a-timedelta"):
        with pytest.raises(ValueError, match="PARTIES_OPEN_TIMEOUT must be a datetime.timedelta"):
            importlib.reload(constants_mod)
    importlib.reload(constants_mod)
