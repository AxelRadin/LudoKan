from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
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
            base_pseudo = slugify(email.split('@')[0])
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
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, pseudo, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    pseudo = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, validators=[validate_avatar])
    avatar_url = models.URLField(blank=True, null=True)
    description_courte = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['pseudo']

    def __str__(self):
        return self.pseudo