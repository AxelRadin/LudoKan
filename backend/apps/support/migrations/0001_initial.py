import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SupportTicket",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("category", models.CharField(choices=[("bug", "Bug"), ("account", "Compte"), ("other", "Autre")], max_length=32)),
                ("subject", models.CharField(max_length=200)),
                ("body", models.TextField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Ouvert"),
                            ("in_progress", "En cours"),
                            ("resolved", "Résolu"),
                            ("closed", "Fermé"),
                        ],
                        db_index=True,
                        default="open",
                        max_length=32,
                    ),
                ),
                ("page_url", models.URLField(blank=True, max_length=2048)),
                ("internal_note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "assigned_to",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="assigned_support_tickets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="support_tickets",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="supportticket",
            index=models.Index(fields=["status", "-created_at"], name="support_sup_status_2b8c8e_idx"),
        ),
    ]
