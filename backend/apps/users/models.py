from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from .validators import validate_avatar


class CustomUserManager(BaseUserManager):
    def create_user(self, email, pseudo=None, password=None, **extra_fields):
        if not email:
            raise ValueError("L'email doit être fourni")
        email = self.normalize_email(email)

        if not pseudo:
            # Générer un pseudo basé sur l'email
            base_pseudo = slugify(email.split("@")[0])
            pseudo_candidate = base_pseudo
            counter = 1
            while self.model.objects.filter(pseudo=pseudo_candidate).exists():
                pseudo_candidate = f"{base_pseudo}{counter}"
                counter += 1
            pseudo = pseudo_candidate

        user = self.model(email=email, pseudo=pseudo, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, pseudo=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, pseudo, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    pseudo = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True, validators=[validate_avatar])
    avatar_url = models.URLField(blank=True, null=True)
    description_courte = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["pseudo"]

    def __str__(self):
        return self.pseudo


class UserRole(models.Model):
    """
    Rôle d'administration/modération associé à un utilisateur.

    On garde la granularité fine via un mapping de permissions en code
    plutôt que de multiplier les colonnes côté base.
    """

    class Role(models.TextChoices):
        MODERATOR = "moderator", "Moderator"
        ADMIN = "admin", "Admin"
        SUPERADMIN = "superadmin", "Super admin"

    user = models.ForeignKey(
        "CustomUser",
        on_delete=models.CASCADE,
        related_name="roles",
    )
    role = models.CharField(max_length=32, choices=Role.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User role"
        verbose_name_plural = "User roles"
        unique_together = ("user", "role")

    def __str__(self) -> str:
        return f"{self.user.pseudo} - {self.get_role_display()}"


class UserSuspension(models.Model):
    """
    Suspension d'un utilisateur, avec support des suspensions temporaires.

    La logique métier (user banni ou non) se base sur is_active + end_date
    plutôt que sur un simple booléen is_active.
    """

    user = models.ForeignKey(
        "CustomUser",
        on_delete=models.CASCADE,
        related_name="suspensions",
    )
    suspended_by = models.ForeignKey(
        "CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="suspensions_made",
    )
    reason = models.TextField()
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "User suspension"
        verbose_name_plural = "User suspensions"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["user", "is_active", "end_date"]),
        ]

    def __str__(self) -> str:
        base = f"Suspension de {self.user.pseudo}"
        if self.end_date:
            return f"{base} jusqu'au {self.end_date}"
        return base

    @property
    def is_expired(self) -> bool:
        if not self.is_active:
            return True
        if self.end_date is None:
            return False
        return self.end_date <= timezone.now()


class AdminAction(models.Model):
    """
    Log d'actions administrateur (audit trail).

    On stocke uniquement target_type / target_id pour éviter un couplage
    fort avec les apps métiers (users, reviews, ratings, ...).
    """

    admin_user = models.ForeignKey(
        "CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="admin_actions",
    )
    action_type = models.CharField(max_length=64)
    target_type = models.CharField(
        max_length=64,
        help_text="Type de cible (user, review, rating, game, ...).",
    )
    target_id = models.PositiveBigIntegerField(
        null=True,
        blank=True,
        help_text="Identifiant de la cible dans sa table.",
    )
    description = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Admin action"
        verbose_name_plural = "Admin actions"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["action_type"]),
            models.Index(fields=["target_type", "target_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.action_type} par {self.admin_user} sur {self.target_type}#{self.target_id}"
