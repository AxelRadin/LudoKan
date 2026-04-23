from django.db import migrations
from django.utils.text import slugify


def fix_empty_pseudos(apps, schema_editor):
    CustomUser = apps.get_model("users", "CustomUser")
    max_len = CustomUser._meta.get_field("pseudo").max_length

    for user in CustomUser.objects.filter(pseudo=""):
        email = (user.email or "").strip()
        local = email.split("@", 1)[0] if "@" in email else "user"
        base_pseudo = (slugify(local) or "user")[:max_len]
        pseudo_candidate = base_pseudo
        counter = 1
        while CustomUser.objects.filter(pseudo=pseudo_candidate).exists():
            suffix = str(counter)
            truncated = base_pseudo[: max(1, max_len - len(suffix))]
            pseudo_candidate = f"{truncated}{suffix}"
            counter += 1
        user.pseudo = pseudo_candidate
        user.save(update_fields=["pseudo"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0008_steamprofile"),
    ]

    operations = [
        migrations.RunPython(fix_empty_pseudos, noop_reverse),
    ]
