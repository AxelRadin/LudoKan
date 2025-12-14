import os

from django.conf import settings
from django.core.exceptions import ValidationError

from .errors import UserErrors


def validate_avatar(file):
    """
    Valide le fichier avatar uploadé.
    - Taille max: 2 Mo
    - Formats supportés: jpg, jpeg, png, webp
    """
    # Créer le dossier avatars s'il n'existe pas
    if hasattr(settings, "MEDIA_ROOT") and settings.MEDIA_ROOT:
        avatars_dir = os.path.join(settings.MEDIA_ROOT, "avatars")
        os.makedirs(avatars_dir, exist_ok=True)

        # Créer .gitkeep pour garder la structure dans Git
        gitkeep_file = os.path.join(avatars_dir, ".gitkeep")
        if not os.path.exists(gitkeep_file):
            open(gitkeep_file, "a").close()

    max_size = 2 * 1024 * 1024  # 2MB

    if file.size > max_size:
        raise ValidationError(UserErrors.AVATAR_TOO_LARGE)

    valid_extensions = ["jpg", "jpeg", "png", "webp"]
    ext = file.name.split(".")[-1].lower()

    if ext not in valid_extensions:
        raise ValidationError(UserErrors.AVATAR_INVALID_FORMAT)

    return file
