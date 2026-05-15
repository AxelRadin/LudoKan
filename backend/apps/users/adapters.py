from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.conf import settings as django_settings
from django.utils import translation

from apps.users.models import CustomUser


class LudokanAccountAdapter(DefaultAccountAdapter):
    """Injecte frontend_url, applique la langue de la requête pour les e-mails allauth, et force les URLs SPA."""

    def _frontend_base(self) -> str:
        return getattr(django_settings, "FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")

    def send_mail(self, template_prefix, email, context):
        context["frontend_url"] = self._frontend_base()
        request = context.get("request")
        lang = None
        if request is not None:
            try:
                lang = translation.get_language_from_request(request)
            except Exception:
                lang = None
        if not lang:
            lang = translation.get_language() or django_settings.LANGUAGE_CODE

        with translation.override(lang):
            return super().send_mail(template_prefix, email, context)

    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        Force l'URL vers le SPA avec un paramètre de langue optionnel.
        """
        lang = translation.get_language()
        url = f"{self._frontend_base()}/verify-email/{emailconfirmation.key}"
        if lang:
            url += f"?lang={lang}"
        return url

    def get_reset_password_from_key_url(self, key):
        """
        Lien direct vers le SPA (uid/token) avec paramètre de langue.
        """
        base = self._frontend_base()
        lang = translation.get_language()
        url = None

        if "-" in key:
            uid, token = key.split("-", 1)
            url = f"{base}/reset-password/{uid}/{token}"
        else:
            url = super().get_reset_password_from_key_url(key)

        if url and lang:
            separator = "&" if "?" in url else "?"
            url += f"{separator}lang={lang}"
        return url


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Renseigne un pseudo unique pour les comptes créés via un fournisseur OAuth.

    django-allauth n'appelle pas CustomUserManager.create_user() sur ce chemin,
    ce qui laissait pseudo vide et provoquait une violation d'unicité en base.
    """

    def save_user(self, request, sociallogin, form=None):
        # allauth 65+: apps configured via APPS in settings are in-memory objects
        # with no PK. SocialToken has a FK to SocialApp, so Django refuses to save
        # the token when the app isn't persisted. We upsert the app to DB first.
        if sociallogin.token and sociallogin.token.app and not sociallogin.token.app.pk:
            from allauth.socialaccount.models import SocialApp
            from django.conf import settings
            from django.contrib.sites.models import Site

            app_cfg = sociallogin.token.app
            db_app, created = SocialApp.objects.get_or_create(
                provider=app_cfg.provider,
                client_id=app_cfg.client_id,
                defaults={
                    "name": getattr(app_cfg, "name", None) or app_cfg.provider.title(),
                    "secret": app_cfg.secret,
                    "key": getattr(app_cfg, "key", "") or "",
                },
            )
            if created:
                db_app.sites.add(Site.objects.get(pk=settings.SITE_ID))

            sociallogin.token.app = db_app

        return super().save_user(request, sociallogin, form)

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if (getattr(user, "pseudo", None) or "").strip():
            return user

        account = getattr(sociallogin, "account", None)
        extra = (account.extra_data if account else None) or {}
        email = (getattr(user, "email", None) or data.get("email") or "").strip()
        seed = None
        for key in ("name", "given_name", "nickname"):
            val = extra.get(key)
            if val and str(val).strip():
                seed = str(val).strip()
                break
        if not seed and email and "@" in email:
            seed = email.split("@", 1)[0]
        if not seed:
            sub = extra.get("sub") or extra.get("id")
            seed = str(sub).strip() if sub else "user"

        user.pseudo = CustomUser.objects.generate_unique_pseudo(seed)
        return user
