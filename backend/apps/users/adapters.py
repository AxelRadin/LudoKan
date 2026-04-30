from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

from apps.users.models import CustomUser


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Renseigne un pseudo unique pour les comptes créés via un fournisseur OAuth.

    django-allauth n'appelle pas CustomUserManager.create_user() sur ce chemin,
    ce qui laissait pseudo vide et provoquait une violation d'unicité en base.
    """

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
