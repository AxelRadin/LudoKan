from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0015_enable_pg_trgm"),
        ("games", "0015_game_steam_appid"),
    ]

    operations = []
