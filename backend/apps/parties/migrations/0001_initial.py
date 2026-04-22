import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("chat", "0003_alter_chatroom_type"),
        ("games", "0015_game_steam_appid"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="GameParty",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("open", "Open"),
                            ("waiting_ready", "Waiting ready"),
                            ("waiting_ready_for_chat", "Waiting ready for chat"),
                            ("countdown", "Countdown"),
                            ("chat_active", "Chat active"),
                            ("cancelled", "Cancelled"),
                        ],
                        db_index=True,
                        default="open",
                        max_length=32,
                    ),
                ),
                ("max_players", models.PositiveIntegerField()),
                ("open_deadline_at", models.DateTimeField(blank=True, null=True)),
                ("ready_deadline_at", models.DateTimeField(blank=True, null=True)),
                ("ready_for_chat_deadline_at", models.DateTimeField(blank=True, null=True)),
                ("countdown_started_at", models.DateTimeField(blank=True, null=True)),
                ("countdown_ends_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "chat_room",
                    models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="game_party",
                        to="chat.chatroom",
                    ),
                ),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="game_parties",
                        to="games.game",
                    ),
                ),
            ],
            options={
                "verbose_name": "Game party",
                "verbose_name_plural": "Game parties",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="GamePartyMember",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "membership_status",
                    models.CharField(
                        choices=[
                            ("active", "Active"),
                            ("declined", "Declined"),
                            ("timed_out", "Timed out"),
                            ("left", "Left"),
                        ],
                        db_index=True,
                        default="active",
                        max_length=16,
                    ),
                ),
                (
                    "ready_state",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("declined", "Declined"),
                            ("timed_out", "Timed out"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                (
                    "ready_for_chat_state",
                    models.CharField(
                        choices=[
                            ("pending", "Pending"),
                            ("accepted", "Accepted"),
                            ("declined", "Declined"),
                            ("timed_out", "Timed out"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=16,
                    ),
                ),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("left_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "party",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="members",
                        to="parties.gameparty",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="party_memberships",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Game party member",
                "verbose_name_plural": "Game party members",
                "ordering": ["joined_at"],
            },
        ),
        migrations.AddIndex(
            model_name="gameparty",
            index=models.Index(fields=["status", "open_deadline_at"], name="parties_gam_status_6e4f8e_idx"),
        ),
        migrations.AddIndex(
            model_name="gameparty",
            index=models.Index(fields=["status", "countdown_ends_at"], name="parties_gam_status_8a1c2d_idx"),
        ),
        migrations.AddIndex(
            model_name="gameparty",
            index=models.Index(fields=["game", "status"], name="parties_gam_game_id_3f9b2a_idx"),
        ),
        migrations.AddIndex(
            model_name="gamepartymember",
            index=models.Index(fields=["party", "membership_status"], name="parties_gam_party_i_7c4e1b_idx"),
        ),
        migrations.AddIndex(
            model_name="gamepartymember",
            index=models.Index(fields=["party", "ready_state"], name="parties_gam_party_i_9d2a5f_idx"),
        ),
        migrations.AddIndex(
            model_name="gamepartymember",
            index=models.Index(fields=["party", "ready_for_chat_state"], name="parties_gam_party_i_a3e8c1_idx"),
        ),
        migrations.AddConstraint(
            model_name="gamepartymember",
            constraint=models.UniqueConstraint(fields=("party", "user"), name="unique_party_user"),
        ),
    ]
