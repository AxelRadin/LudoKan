from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("games", "0014_gamevideo_gamescreenshot_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS pg_trgm;",
            reverse_sql="DROP EXTENSION IF EXISTS pg_trgm;",
        ),
    ]
