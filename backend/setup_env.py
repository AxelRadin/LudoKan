#!/usr/bin/env python
"""
Script pour créer automatiquement le fichier .env
"""
import os
import secrets
from pathlib import Path


def generate_secret_key():
    """Génère une clé secrète Django sécurisée"""
    return "".join(secrets.choice("abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*(-_=+)") for i in range(50))


def create_env_file():
    """Crée le fichier .env à la racine du projet"""

    # Chemin vers le fichier .env (à la racine du projet)
    project_root = Path(__file__).parent.parent
    env_file = project_root / ".env"

    # Valeurs de base de données (avec possibilité de les surcharger via l'env)
    db_name = os.getenv("POSTGRES_DB", "tesp_db")
    db_user = os.getenv("POSTGRES_USER", "tesp_user")
    # On ne met pas de mot de passe en dur : soit on lit une variable d'env, soit on génère un mot de passe aléatoire.
    db_password = os.getenv("POSTGRES_PASSWORD") or secrets.token_urlsafe(16)
    db_host = os.getenv("DB_HOST", "db")
    db_port = os.getenv("DB_PORT", "5432")
    database_url = os.getenv(
        "DATABASE_URL",
        f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}",
    )

    # Contenu du fichier .env
    env_content = f"""# ===========================================
# CONFIGURATION LUDOKAN - ENVIRONNEMENT DE DÉVELOPPEMENT
# ===========================================
# Généré automatiquement le {os.popen('date').read().strip()}

# ===========================================
# BASE DE DONNÉES
# ===========================================
POSTGRES_DB={db_name}
POSTGRES_USER={db_user}
POSTGRES_PASSWORD={db_password}
DATABASE_URL={database_url}
DB_HOST={db_host}
DB_PORT={db_port}

# ===========================================
# DJANGO
# ===========================================
SECRET_KEY={generate_secret_key()}
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

# ===========================================
# EMAIL (pour les tâches Celery)
# ===========================================
DEFAULT_FROM_EMAIL=noreply@ludokan.com
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# ===========================================
# REDIS
# ===========================================
REDIS_URL=redis://redis:6379/0

# ===========================================
# CELERY
# ===========================================
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
CELERY_CACHE_BACKEND=redis://redis:6379/2

# ===========================================
# CORS (Cross-Origin Resource Sharing)
# ===========================================
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=True

# ===========================================
# STATIC FILES
# ===========================================
STATIC_URL=/static/
STATIC_ROOT=/app/static
MEDIA_URL=/media/
MEDIA_ROOT=/app/media
"""

    # Écrire le fichier
    try:
        with open(env_file, "w") as f:
            f.write(env_content)
        print(f"✅ Fichier .env créé avec succès : {env_file}")
        print("🔑 Une nouvelle clé secrète Django a été générée")
        print("📝 Vous pouvez maintenant modifier les valeurs selon vos besoins")
        return True
    except Exception as e:
        print(f"❌ Erreur lors de la création du fichier .env : {e}")
        return False


def check_env_file():
    """Vérifie si le fichier .env existe déjà"""
    project_root = Path(__file__).parent.parent
    env_file = project_root / ".env"

    if env_file.exists():
        response = input("⚠️  Le fichier .env existe déjà. Voulez-vous le remplacer ? (y/N): ")
        return response.lower() in ["y", "yes", "oui", "o"]
    return True


if __name__ == "__main__":
    print("🚀 Configuration de l'environnement LudoKan")
    print("=" * 50)

    if check_env_file():
        if create_env_file():
            print("\n📋 Prochaines étapes :")
            print("1. Vérifiez le fichier .env créé")
            print("2. Modifiez les valeurs si nécessaire")
            print("3. Lancez : docker compose up -d")
            print("4. Testez : docker compose exec web python test_celery.py")
        else:
            print("\n❌ Échec de la création du fichier .env")
    else:
        print("❌ Création annulée")
