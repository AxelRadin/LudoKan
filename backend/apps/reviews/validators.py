"""
Validateurs personnalisés pour l'app reviews.
"""
from django.core.exceptions import ValidationError


def validate_review_content_length(value):
    """
    Valide que le contenu d'une review fait entre 4 et 500 caractères.

    Args:
        value (str): Le contenu à valider

    Raises:
        ValidationError: Si le contenu ne respecte pas la longueur requise
    """
    if not (4 <= len(value) <= 500):
        raise ValidationError(
            "Le contenu doit faire entre 4 et 500 caracteres."
        )
