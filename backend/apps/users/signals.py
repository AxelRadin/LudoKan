from allauth.socialaccount.signals import social_account_added
from django.dispatch import receiver

from .models import XboxProfile


@receiver(social_account_added)
def create_xbox_profile(request, sociallogin, **kwargs):
    """
    Crée un XboxProfile automatiquement quand un compte Microsoft est lié.
    """
    if sociallogin.account.provider == "microsoft":
        user = sociallogin.user
        extra_data = sociallogin.account.extra_data

        # L'ID Microsoft Graph (GUID) servira d'identifiant par défaut
        # en attendant la première synchro Xbox qui récupérera le vrai XUID.
        m_id = extra_data.get("id")
        gamertag = extra_data.get("displayName", "")

        XboxProfile.objects.get_or_create(
            user=user,
            defaults={
                "xbox_xuid": m_id,
                "gamertag": gamertag,
            },
        )
