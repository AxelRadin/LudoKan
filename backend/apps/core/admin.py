"""
Le modèle Notification de django-notifications-hq.
Modèles BACK-021A : SystemLog, ActivityLog, ReportSchedule.
"""

from django import forms
from django.contrib import admin

from .models import ActivityLog, ReportSchedule, SystemLog


@admin.register(SystemLog)
class SystemLogAdmin(admin.ModelAdmin):
    list_display = ("id", "event_type", "user", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("event_type", "description")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "action", "target_type", "target_id", "created_at")
    list_filter = ("action", "target_type", "created_at")
    search_fields = ("user__email", "user__pseudo", "action")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"


class ReportScheduleAdminForm(forms.ModelForm):
    """
    Champ Recipients en texte : un email par ligne ou séparés par des virgules.
    Converti en liste JSON à la sauvegarde.
    """

    recipients = forms.CharField(
        widget=forms.Textarea(attrs={"rows": 4, "placeholder": "admin@example.com\nmanager@example.com"}),
        required=False,
        help_text="Un email par ligne, ou séparés par des virgules. Laisser vide pour aucune adresse.",
    )

    class Meta:
        model = ReportSchedule
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk and isinstance(self.instance.recipients, list):
            self.initial["recipients"] = "\n".join(self.instance.recipients)

    def clean_recipients(self):
        raw = self.cleaned_data.get("recipients") or ""
        emails = []
        for part in raw.replace(",", "\n").splitlines():
            email = part.strip()
            if email:
                emails.append(email)
        return emails


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    form = ReportScheduleAdminForm
    list_display = ("id", "report_type", "frequency", "enabled", "last_run", "next_run")
    list_filter = ("report_type", "frequency", "enabled")
    list_editable = ("enabled",)
    readonly_fields = ("created_at", "updated_at")
    search_fields = ("recipients",)
