from django.contrib import admin

from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ("pseudo", "email", "first_name", "last_name", "is_staff")
    search_fields = ("pseudo", "email")
    list_filter = ("is_staff", "is_active")
