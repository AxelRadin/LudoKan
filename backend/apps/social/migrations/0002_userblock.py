# Generated manually

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("social", "0001_friends_and_visibility"),
    ]

    operations = [
        migrations.CreateModel(
            name="UserBlock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "blocked",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="blocks_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "blocker",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="blocks_created",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Blocage utilisateur",
                "verbose_name_plural": "Blocages utilisateurs",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="userblock",
            constraint=models.UniqueConstraint(fields=("blocker", "blocked"), name="social_userblock_blocker_blocked_uniq"),
        ),
    ]
