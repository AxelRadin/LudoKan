from allauth.account.models import EmailAddress
from django import forms
from django.contrib import admin, messages
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django.utils import timezone
from import_export import resources
from import_export.admin import ImportExportModelAdmin

from .models import AdminAction, CustomUser, UserRole, UserSuspension
from .permissions import has_permission


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


@admin.action(description="Suspendre les utilisateurs sélectionnés")
def suspend_users(modeladmin, request, queryset):
    """
    Action d'admin pour suspendre plusieurs utilisateurs en une fois.

    La logique métier est alignée avec AdminSuspendUserView :
    - nécessite la permission métier "suspend_user"
    - impossible de se suspendre soi-même
    - impossible de suspendre un superuser ou un SUPERADMIN
    """
    actor = request.user

    if not has_permission(actor, "suspend_user"):
        raise PermissionDenied("Vous n'avez pas la permission de suspendre des utilisateurs.")

    suspended_count = 0
    skipped_self = 0
    skipped_superadmin = 0

    for target in queryset:
        # Empêcher l'auto-suspension
        if actor.pk == target.pk:
            skipped_self += 1
            continue

        # Empêcher la suspension d'un superadmin / superuser
        target_roles = set(UserRole.objects.filter(user=target).values_list("role", flat=True))
        if target.is_superuser or UserRole.Role.SUPERADMIN in target_roles:
            skipped_superadmin += 1
            continue

        suspension = UserSuspension.objects.create(
            user=target,
            suspended_by=actor,
            reason="Suspension via Django admin",
        )

        AdminAction.objects.create(
            admin_user=actor,
            action_type="user.suspend",
            target_type="user",
            target_id=target.pk,
            description=suspension.reason,
        )

        suspended_count += 1

    if suspended_count:
        modeladmin.message_user(
            request,
            f"{suspended_count} utilisateur(s) ont été suspendus.",
            level=messages.SUCCESS,
        )

    if skipped_self:
        modeladmin.message_user(
            request,
            "Vous ne pouvez pas vous suspendre vous-même. " f"{skipped_self} utilisateur(s) ignoré(s) pour cette raison.",
            level=messages.WARNING,
        )

    if skipped_superadmin:
        modeladmin.message_user(
            request,
            "Les superadmins ou superusers ne peuvent pas être suspendus. " f"{skipped_superadmin} utilisateur(s) ignoré(s).",
            level=messages.WARNING,
        )


class UserRoleInline(admin.TabularInline):
    model = UserRole
    extra = 0
    autocomplete_fields = ["user"]
    can_delete = True


class UserResource(resources.ModelResource):
    class Meta:
        model = CustomUser
        fields = (
            "id",
            "email",
            "pseudo",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "created_at",
            "updated_at",
        )
        export_order = fields
        import_id_fields = ("id", "email")


@admin.register(CustomUser)
class CustomUserAdmin(ImportExportModelAdmin):
    form = CustomUserAdminForm
    resource_class = UserResource

    list_display = ("pseudo", "email", "first_name", "last_name", "is_staff", "is_suspended", "email_verified")
    search_fields = ("pseudo", "email", "first_name", "last_name")
    list_filter = ("is_staff", "is_active", "created_at")
    actions = [verify_user, suspend_users]
    inlines = [UserRoleInline]

    def has_import_permission(self, request, *args, **kwargs):
        """
        Restreint l'import aux rôles admin/superadmin via la permission métier.
        """
        return has_permission(request.user, "import_export.user")

    def has_export_permission(self, request, *args, **kwargs):
        """
        Autorise l'export à tout staff authentifié.
        """
        return bool(getattr(request.user, "is_staff", False))

    @admin.display(boolean=True, description="Email vérifié (allauth)")
    def email_verified(self, obj):
        """
        Affiche dans la liste admin si l'email de l'utilisateur est
        vérifié côté django-allauth.
        """
        return EmailAddress.objects.filter(user=obj, email=obj.email, verified=True).exists()

    @admin.display(boolean=True, description="Suspendu")
    def is_suspended(self, obj):
        """
        Indique si l'utilisateur a au moins une suspension active (non expirée).
        """
        now = timezone.now()
        return UserSuspension.objects.filter(user=obj, is_active=True).filter(Q(end_date__isnull=True) | Q(end_date__gt=now)).exists()


@admin.register(UserSuspension)
class UserSuspensionAdmin(admin.ModelAdmin):
    list_display = ("user", "suspended_by", "is_active", "is_expired", "start_date", "end_date")
    list_filter = ("is_active", "start_date", "end_date")
    search_fields = ("user__email", "user__pseudo", "suspended_by__email", "suspended_by__pseudo")
    autocomplete_fields = ("user", "suspended_by")
    readonly_fields = ("created_at",)
    list_select_related = ("user", "suspended_by")
    date_hierarchy = "start_date"


@admin.register(AdminAction)
class AdminActionAdmin(admin.ModelAdmin):
    list_display = ("timestamp", "admin_user", "action_type", "target_type", "target_id")
    list_filter = ("action_type", "target_type")
    search_fields = ("admin_user__email", "admin_user__pseudo", "description")
    autocomplete_fields = ("admin_user",)
    readonly_fields = ("timestamp",)
    list_select_related = ("admin_user",)
    date_hierarchy = "timestamp"
