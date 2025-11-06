# 📚 Documentation LudoKan

Bienvenue dans la documentation de LudoKan ! Cette section contient tous les guides et références nécessaires pour comprendre, développer et déployer la plateforme.

## 🚀 Démarrage rapide

- [Guide d'installation](README.md) - Installation et configuration de base
- [Configuration de l'environnement](backend/ENV_SETUP.md) - Variables d'environnement
- [Guide Docker](backend/DOCKER.md) - Utilisation avec Docker

## 🔧 Développement

### Backend
- [Configuration Celery](backend/CELERY.md) - Tâches asynchrones
- [Guide des tests](backend/TESTING.md) - Tests et qualité du code
- [Documentation API](API.md) - Référence de l'API REST

### Infrastructure
- [Guide Docker](backend/DOCKER.md) - Containerisation

## 📋 Références

### Tests
- [Structure des tests](backend/TESTING.md#structure-des-tests)
- [Commandes de test](backend/TESTING.md#commandes-de-test)
- [Fixtures et factories](backend/TESTING.md#fixtures-et-factories)
- [Couverture de code](backend/TESTING.md#couverture-de-code)

### Docker
- [Services disponibles](backend/DOCKER.md#services-disponibles)
- [Commandes utiles](backend/DOCKER.md#commandes-utiles)
- [Dépannage](backend/DOCKER.md#dépannage)

## 🏗️ Architecture

### Vue d'ensemble
```
LudoKan/
├── backend/                 # Backend Django
│   ├── apps/               # Applications Django
│   │   ├── users/          # Gestion des utilisateurs
│   │   ├── games/          # Gestion des jeux
│   │   ├── library/        # Bibliothèque personnelle
│   │   ├── social/         # Fonctionnalités sociales
│   │   ├── recommendations/ # Système de recommandations
│   │   └── core/           # Utilitaires communs
│   ├── config/             # Configuration Django
│   ├── tests/              # Tests globaux
│   └── requirements.txt    # Dépendances Python
├── docs/                   # Documentation
├── docker-compose.yml      # Configuration Docker
└── README.md              # Documentation principale
```

### Technologies
- **Backend** : Django 4.2 + Django REST Framework
- **Base de données** : PostgreSQL
- **Cache** : Redis
- **Tâches asynchrones** : Celery
- **Containerisation** : Docker + Docker Compose
- **Tests** : pytest + Factory Boy
- **Documentation** : Markdown

## 🔍 Recherche

### Par catégorie
- **Installation** : [README.md](README.md), [ENV_SETUP.md](backend/ENV_SETUP.md)
- **Développement** : [TESTING.md](backend/TESTING.md)
- **API** : [API.md](API.md)
- **Docker** : [DOCKER.md](backend/DOCKER.md)
- **Celery** : [CELERY.md](backend/CELERY.md)

### Par niveau
- **Débutant** : [README.md](README.md), [ENV_SETUP.md](backend/ENV_SETUP.md)
- **Intermédiaire** : [TESTING.md](backend/TESTING.md), [API.md](API.md)

## 📞 Support

### Ressources
- [Documentation API](http://localhost:8000/api/docs/)

### Contact
- **Email** : support@ludokan.com
- **Discord** : [Serveur LudoKan](https://discord.gg/ludokan)
- **Twitter** : [@LudoKanApp](https://twitter.com/LudoKanApp)

## 🔄 Mise à jour

Cette documentation est maintenue avec le projet. Pour la version la plus récente :
- Consultez la branche `main` du repository
- Vérifiez les dernières releases
- Suivez les changelogs

## 📄 Licence

Cette documentation est sous licence MIT. Voir le fichier [LICENSE](../LICENSE) pour plus de détails.

---

**Note** : Cette documentation est en constante évolution. Pour des questions spécifiques, n'hésitez pas à ouvrir une issue sur GitHub.

