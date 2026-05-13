from allauth.account.signals import email_confirmed, user_signed_up
from allauth.socialaccount.signals import social_account_added
from django.dispatch import receiver
from allauth.account.adapter import get_adapter

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


@receiver(email_confirmed)
def send_welcome_email_on_confirmation(request, email_address, **kwargs):
    """
    Envoie un email de bienvenue une fois que l'email est confirmé.
    Couvre l'inscription classique et l'ajout ultérieur d'un email.
    """
    user = email_address.user
    adapter = get_adapter(request)
    context = {
        "user": user,
    }
    adapter.send_mail("account/email/welcome", email_address.email, context)


@receiver(user_signed_up)
def send_welcome_email_on_social_signup(request, user, **kwargs):
    """
    Envoie un email de bienvenue lors de l'inscription sociale,
    si l'email est déjà considéré comme vérifié par le fournisseur.
    """
    from allauth.account.models import EmailAddress

    # On vérifie si l'utilisateur a un email vérifié
    email_obj = EmailAddress.objects.filter(user=user, verified=True).first()
    if email_obj:
        adapter = get_adapter(request)
        context = {"user": user}
        adapter.send_mail("account/email/welcome", email_obj.email, context)
