#!/usr/bin/env python
"""
Script de test pour vérifier que Celery fonctionne correctement
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.tasks import send_welcome_email, process_game_data, cleanup_old_sessions


def test_celery_tasks():
    """Test des tâches Celery"""
    print("🧪 Test des tâches Celery...")
    
    # Test 1: Tâche simple
    print("\n1. Test d'envoi d'email...")
    result = send_welcome_email.delay("test@example.com", "TestUser")
    print(f"   Tâche créée: {result.id}")
    print(f"   Résultat: {result.get(timeout=10)}")
    
    # Test 2: Tâche avec paramètres
    print("\n2. Test de traitement de données...")
    result = process_game_data.delay(123)
    print(f"   Tâche créée: {result.id}")
    print(f"   Résultat: {result.get(timeout=15)}")
    
    # Test 3: Tâche de nettoyage
    print("\n3. Test de nettoyage...")
    result = cleanup_old_sessions.delay()
    print(f"   Tâche créée: {result.id}")
    print(f"   Résultat: {result.get(timeout=10)}")
    
    print("\n✅ Tous les tests sont passés!")


if __name__ == "__main__":
    test_celery_tasks()
