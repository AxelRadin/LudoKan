import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0001_add_notification_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="SystemLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_type", models.CharField(db_index=True, max_length=64)),
                ("description", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="system_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "System log",
                "verbose_name_plural": "System logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ActivityLog",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("login", "Login"),
                            ("logout", "Logout"),
                            ("review_posted", "Review posted"),
                            ("rating_added", "Rating added"),
                            ("message_sent", "Message sent"),
                            ("library_add", "Game added to library"),
                            ("library_remove", "Game removed from library"),
                            ("profile_update", "Profile updated"),
                            ("other", "Other"),
                        ],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                ("target_type", models.CharField(blank=True, db_index=True, max_length=64)),
                ("target_id", models.PositiveBigIntegerField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(db_index=True, default=django.utils.timezone.now)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="activity_logs",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Activity log",
                "verbose_name_plural": "Activity logs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="ReportSchedule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "report_type",
                    models.CharField(
                        choices=[("users", "Users"), ("games", "Games"), ("activity", "Activity")],
                        db_index=True,
                        max_length=32,
                    ),
                ),
                (
                    "frequency",
                    models.CharField(
                        choices=[("daily", "Daily"), ("weekly", "Weekly"), ("monthly", "Monthly")],
                        db_index=True,
                        max_length=16,
                    ),
                ),
                (
                    "recipients",
                    models.JSONField(default=list, help_text="Liste d'adresses email des destinataires du rapport."),
                ),
                ("last_run", models.DateTimeField(blank=True, null=True)),
                ("next_run", models.DateTimeField(blank=True, null=True)),
                ("enabled", models.BooleanField(db_index=True, default=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "Report schedule",
                "verbose_name_plural": "Report schedules",
                "ordering": ["report_type", "frequency"],
            },
        ),
        migrations.AddIndex(
            model_name="systemlog",
            index=models.Index(fields=["event_type", "created_at"], name="core_system_event_t_2a1c4a_idx"),
        ),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["user", "created_at"], name="core_activi_user_id_8f3d2b_idx"),
        ),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["action", "created_at"], name="core_activi_action_9e4c1a_idx"),
        ),
        migrations.AddIndex(
            model_name="activitylog",
            index=models.Index(fields=["target_type", "target_id"], name="core_activi_target__7b5a0d_idx"),
        ),
        migrations.AddIndex(
            model_name="reportschedule",
            index=models.Index(fields=["enabled", "next_run"], name="core_report_enabled_1d6e7f_idx"),
        ),
    ]
