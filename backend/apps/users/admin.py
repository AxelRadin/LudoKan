from allauth.account.models import EmailAddress
from django import forms
from django.contrib import admin

from .models import CustomUser


class CustomUserAdminForm(forms.ModelForm):
    new_password1 = forms.CharField(
        label="Nouveau mot de passe",
        widget=forms.PasswordInput,
        required=False,
        help_text="Laissez vide si vous ne souhaitez pas changer le mot de passe.",
    )
    new_password2 = forms.CharField(
        label="Confirmation du mot de passe",
        widget=forms.PasswordInput,
        required=False,
    )

    class Meta:
        model = CustomUser
        fields = [
            "email",
            "pseudo",
            "first_name",
            "last_name",
            "avatar",
            "avatar_url",
            "description_courte",
            "is_active",
            "is_staff",
        ]

    def clean(self):
        cleaned_data = super().clean()
        pw1 = cleaned_data.get("new_password1")
        pw2 = cleaned_data.get("new_password2")

        if (pw1 or pw2) and pw1 != pw2:
            raise forms.ValidationError("Les mots de passe ne correspondent pas.")

        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)

        new_password = self.cleaned_data.get("new_password1")
        if new_password:
            user.set_password(new_password)

        if commit:
            user.save()

        return user


@admin.action(description="Marquer l'utilisateur comme vérifié")
def verify_user(modeladmin, request, queryset):
    """
    Action d'admin pour marquer les utilisateurs sélectionnés comme vérifiés
    uniquement côté django-allauth (EmailAddress).
    """
    for user in queryset:
        EmailAddress.objects.update_or_create(
            user=user,
            email=user.email,
            defaults={
                "verified": True,
                "primary": True,
            },
        )


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    form = CustomUserAdminForm

    list_display = ("pseudo", "email", "first_name", "last_name", "is_staff", "email_verified")
    search_fields = ("pseudo", "email")
    list_filter = ("is_staff", "is_active")
    actions = [verify_user]

    @admin.display(boolean=True, description="Email vérifié (allauth)")
    def email_verified(self, obj):
        """
        Affiche dans la liste admin si l'email de l'utilisateur est
        vérifié côté django-allauth.
        """
        return EmailAddress.objects.filter(user=obj, email=obj.email, verified=True).exists()
