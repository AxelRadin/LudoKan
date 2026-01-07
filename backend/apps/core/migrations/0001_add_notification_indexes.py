from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            CREATE INDEX IF NOT EXISTS notifications_notification_recipient_id_idx
            ON notifications_notification ("recipient_id");

            CREATE INDEX IF NOT EXISTS notifications_notification_unread_idx
            ON notifications_notification ("unread");

            CREATE INDEX IF NOT EXISTS notifications_notification_recipient_unread_timestamp_idx
            ON notifications_notification ("recipient_id", "unread", "timestamp" DESC);
            """,
            reverse_sql="""
            DROP INDEX IF EXISTS notifications_notification_recipient_id_idx;
            DROP INDEX IF EXISTS notifications_notification_unread_idx;
            DROP INDEX IF EXISTS notifications_notification_recipient_unread_timestamp_idx;
            """,
        ),
    ]
