import os
import sys

import django

from apps.core.models import SystemLog

# Setup Django
sys.path.append("/Users/andre/Desktop/Epitech/LudoKan/backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()


print("--- LAST 20 SYSTEM LOGS ---")
logs = SystemLog.objects.all().order_by("-created_at")[:20]
for log in logs:
    user_pseudo = log.user.pseudo if log.user else "Anonymous"
    print(f"[{log.created_at}] [{log.event_type}] ({user_pseudo}) {log.description}")
    if log.metadata:
        print(f"    Metadata: {log.metadata}")
print("--- END ---")
