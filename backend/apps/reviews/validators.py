"""
Validateurs personnalisés pour l'app reviews.
"""

from django.core.exceptions import ValidationError


def validate_review_content_length(value):
    """
    Valide que le contenu d'une review fait entre 4 et 500 caractères.
    Un contenu vide est autorisé (note seule sans texte).

    Args:
        value (str): Le contenu à valider

    Raises:
        ValidationError: Si le contenu ne respecte pas la longueur requise
    """
    if value and len(value) > 500:
        raise ValidationError("Le contenu ne peut pas dépasser 500 caractères.")
