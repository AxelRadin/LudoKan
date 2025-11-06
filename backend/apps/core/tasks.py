from celery import shared_task
import time
from django.core.mail import send_mail
from django.conf import settings


@shared_task
def send_welcome_email(user_email, username):
    """
    Tâche pour envoyer un email de bienvenue
    """
    try:
        send_mail(
            'Bienvenue sur LudoKan!',
            f'Bonjour {username}, bienvenue sur notre plateforme!',
            settings.DEFAULT_FROM_EMAIL,
            [user_email],
            fail_silently=False,
        )
        return f'Email envoyé à {user_email}'
    except Exception as e:
        return f'Erreur lors de l\'envoi: {str(e)}'


@shared_task
def process_game_data(game_id):
    """
    Tâche pour traiter des données de jeu (exemple)
    """
    # Simulation d'un traitement long
    time.sleep(5)
    
    # Ici vous pourriez faire des opérations comme:
    # - Analyser des données de jeu
    # - Générer des statistiques
    # - Envoyer des notifications
    # - etc.
    
    return f'Données du jeu {game_id} traitées avec succès'


@shared_task
def cleanup_old_sessions():
    """
    Tâche de nettoyage des sessions expirées
    """
    from django.contrib.sessions.models import Session
    from django.utils import timezone
    
    # Supprimer les sessions expirées
    expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
    count = expired_sessions.count()
    expired_sessions.delete()
    
    return f'{count} sessions expirées supprimées'


@shared_task
def generate_user_statistics(user_id):
    """
    Tâche pour générer des statistiques utilisateur
    """
    # Simulation d'un calcul complexe
    time.sleep(3)
    
    # Ici vous pourriez calculer:
    # - Nombre de jeux joués
    # - Temps de jeu total
    # - Préférences de genre
    # - etc.
    
    return f'Statistiques générées pour l\'utilisateur {user_id}'
