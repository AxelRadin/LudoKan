from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("openid", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="openidnonce",
            name="id",
            field=models.BigAutoField(
                auto_created=True,
                primary_key=True,
                serialize=False,
                verbose_name="ID",
            ),
        ),
        migrations.AlterField(
            model_name="openidstore",
            name="id",
            field=models.BigAutoField(
                auto_created=True,
                primary_key=True,
                serialize=False,
                verbose_name="ID",
            ),
        ),
    ]
