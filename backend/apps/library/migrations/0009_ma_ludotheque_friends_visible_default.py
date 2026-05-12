# Generated manually — partage ludothèque complète avec les amis activé par défaut.

from django.db import migrations


def forwards_ma_ludotheque_friends_visible(apps, schema_editor):
    UserLibrary = apps.get_model("library", "UserLibrary")
    UserLibrary.objects.filter(system_key="MA_LUDOTHEQUE").update(is_visible_to_friends=True)


class Migration(migrations.Migration):

    dependencies = [
        ("library", "0008_friends_and_visibility"),
    ]

    operations = [
        migrations.RunPython(forwards_ma_ludotheque_friends_visible, migrations.RunPython.noop),
    ]
