from django.db import migrations


class Migration(migrations.Migration):
    """
    Supprime les tables de l'ancienne app game_tickets (jeux demandés par les utilisateurs).
    Les noms de tables suivent le schéma Django par défaut pour l'app game_tickets.
    """

    dependencies = [
        ("support", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DROP TABLE IF EXISTS game_tickets_gameticketcomment CASCADE;
            DROP TABLE IF EXISTS game_tickets_gametickethistory CASCADE;
            DROP TABLE IF EXISTS game_tickets_gameticketattachment CASCADE;
            DROP TABLE IF EXISTS game_tickets_gameticket_genres CASCADE;
            DROP TABLE IF EXISTS game_tickets_gameticket_platforms CASCADE;
            DROP TABLE IF EXISTS game_tickets_gameticket CASCADE;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
