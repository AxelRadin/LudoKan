from django.db import migrations, models


def forwards_null_name_fr_to_empty(apps, schema_editor):
    Game = apps.get_model("games", "Game")
    Game.objects.filter(name_fr__isnull=True).update(name_fr="")


class Migration(migrations.Migration):
    dependencies = [
        ("games", "0011_merge_20260312_1134"),
    ]

    operations = [
        migrations.RunPython(forwards_null_name_fr_to_empty, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="game",
            name="name_fr",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
    ]
