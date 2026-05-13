from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

from apps.users.models import CustomUser


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
