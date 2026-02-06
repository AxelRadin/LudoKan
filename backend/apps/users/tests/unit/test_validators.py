import types

import pytest
from django.core.exceptions import ValidationError

from apps.users.errors import UserErrors
from apps.users.validators import validate_avatar


def make_file(name: str, size: int):
    file = types.SimpleNamespace()
    file.name = name
    file.size = size
    return file


def test_validate_avatar_accepts_valid_png_file():
    file = make_file("avatar.png", size=1024)

    result = validate_avatar(file)

    assert result is file


def test_validate_avatar_rejects_too_large_file():
    file = make_file("avatar.png", size=3 * 1024 * 1024)

    with pytest.raises(ValidationError) as exc:
        validate_avatar(file)

    assert UserErrors.AVATAR_TOO_LARGE in exc.value.messages


def test_validate_avatar_rejects_invalid_extension():
    file = make_file("avatar.bmp", size=1024)

    with pytest.raises(ValidationError) as exc:
        validate_avatar(file)

    assert UserErrors.AVATAR_INVALID_FORMAT in exc.value.messages


def test_validate_avatar_creates_gitkeep_in_media_root(tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path

    avatars_dir = tmp_path / "avatars"
    gitkeep_path = avatars_dir / ".gitkeep"
    assert not gitkeep_path.exists()

    file = make_file("avatar.png", size=1024)

    result = validate_avatar(file)

    assert result is file
    assert gitkeep_path.exists()
