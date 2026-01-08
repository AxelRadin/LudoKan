from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0003_customuser_is_verified"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="customuser",
            name="is_verified",
        ),
    ]
