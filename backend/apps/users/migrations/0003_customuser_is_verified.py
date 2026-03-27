from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_customuser_avatar"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
    ]
