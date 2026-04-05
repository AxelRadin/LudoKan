# 🎮 LudoKan - Fullstack Complete

**Plateforme de gestion de jeux de vidéo avec fonctionnalités sociales et recommandations**

📍 **Branche:** `fullstack-complete` - Version complète avec frontend et backend

## 📋 Vue d'ensemble

LudoKan est une application web moderne permettant aux passionnés de jeux de vidéo de :
- Gérer leur bibliothèque de jeux
- Organiser des sessions de jeu
- Découvrir de nouveaux jeux grâce aux recommandations
- Interagir avec d'autres joueurs
- Suivre leurs statistiques de jeu

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **React 18** avec TypeScript
- **Vite** pour le build et dev server
- **ESLint + Prettier** pour la qualité du code
- Interface moderne et responsive

### Backend (Django + DRF)
- **API REST** avec Django REST Framework
- **Base de données** PostgreSQL
- **Cache** Redis
- **Tâches asynchrones** Celery
- **Authentification** JWT
- **Tests complets** avec pytest

### Infrastructure
- **Docker** pour la containerisation
- **Docker Compose** pour l'orchestration
- **PostgreSQL** pour les données
- **Redis** pour le cache et les tâches

## 🚀 Démarrage rapide

### Prérequis
- Docker et Docker Compose
- Git

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd LudoKan

# Démarrer les services
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
```

### Accès
- **Frontend** : http://localhost:5173
- **API Backend** : http://localhost:8000
- **Admin Django** : http://localhost:8000/admin
- **Documentation API** : http://localhost:8000/api/docs/

## 📚 Documentation

### Architecture & Comparaisons
- [📐 Architecture Backend détaillée](ARCHITECTURE_BACKEND.md) - Vue complète du backend
- [🎨 Diagrammes d'architecture](ARCHITECTURE_DIAGRAM.md) - Diagrammes visuels
- [🔄 Comparatif des branches](COMPARATIF_BRANCHES.md) - Comparaison avec autres branches
- [🎓 Explication de la complexité](EXPLICATION_COMPLEXITE.md) - Pourquoi cette architecture

### Backend
- [Configuration de l'environnement](docs/backend/ENV_SETUP.md)
- [Configuration Celery](docs/backend/CELERY.md)
- [Guide des tests](docs/backend/TESTING.md)
- [Guide Docker](docs/backend/DOCKER.md)
- [Commandes de Gestion](docs/backend/COMMANDS.md)

### Frontend
- [Frontend README](frontend/README.md) - Guide du frontend React + Vite


## 🛠️ Développement

### Structure du projet
```
LudoKan/ (fullstack-complete)
├── frontend/                # Frontend React + Vite
│   ├── src/                # Code source React
│   │   ├── App.tsx         # Composant principal
│   │   ├── main.tsx        # Point d'entrée
│   │   └── assets/         # Assets statiques
│   ├── public/             # Fichiers publics
│   ├── package.json        # Dépendances npm
│   ├── vite.config.ts      # Configuration Vite
│   └── tsconfig.json       # Configuration TypeScript
│
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
│   ├── requirements.txt    # Dépendances Python
│   └── run_tests.py        # Script de tests
│
├── docs/                   # Documentation backend
│   ├── backend/           
│   │   ├── CELERY.md
│   │   ├── DOCKER.md
│   │   ├── ENV_SETUP.md
│   │   └── TESTING.md
│   └── README.md
│
├── ARCHITECTURE_BACKEND.md  # Architecture détaillée
├── ARCHITECTURE_DIAGRAM.md  # Diagrammes visuels
├── COMPARATIF_BRANCHES.md  # Comparaison branches
├── EXPLICATION_COMPLEXITE.md # Guide complexité
├── docker-compose.yml      # Configuration Docker
└── README.md              # Ce fichier
```

### Commandes utiles

#### Backend
```bash
# Tests backend
docker compose exec web python run_tests.py

# Tests avec couverture
docker compose exec web python run_tests.py --coverage

# Migrations
docker compose exec web python manage.py migrate

# Shell Django
docker compose exec web python manage.py shell

# Logs backend
docker compose logs -f web
```

#### Frontend
```bash
# Installer les dépendances
cd frontend && npm install

# Démarrer le dev server
npm run dev

# Build pour production
npm run build

# Linter
npm run lint

# Format du code
npm run format
```

## 🧪 Tests

Le projet utilise pytest pour les tests avec une couverture de code.

```bash
# Exécuter tous les tests
docker compose exec web python run_tests.py

# Tests avec couverture
docker compose exec web python run_tests.py --coverage

# Tests d'une app spécifique
docker compose exec web python run_tests.py --app users
```

## 🔧 Configuration

### Variables d'environnement
Copiez le template et configurez vos variables :
```bash
cp backend/env_template.txt .env
# Éditez .env selon vos besoins
```

### Services & Ports
- **Frontend (Vite)** : Port 5173
- **Backend (Django)** : Port 8000
- **PostgreSQL** : Port 5432
- **Redis** : Port 6379

## 🌟 Fonctionnalités de cette branche

### ✅ Backend complet (backend_orignal_version)
- Infrastructure Docker production-ready
- API REST avec Django REST Framework
- Authentification JWT
- PostgreSQL + Redis
- Celery pour tâches asynchrones
- Suite de tests complète (~1000 lignes)
- Documentation exhaustive

### ✅ Frontend moderne (dev)
- React 18 avec TypeScript
- Vite pour un dev server ultra-rapide
- ESLint + Prettier configurés
- Architecture composants

### ✅ Documentation complète
- 4 documents d'architecture détaillés
- Guides backend complets
- Comparaison des approches techniques


## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 👥 Équipe

- **Mohammed** - Chef de Projet 
- **Danny** - Lead Frontend
- **Yasmine** - Developpeuse Frontend
- **Axel Epitech** - Lead backend 
- **André** - Developpeur backend
- **Victor** - Developpeur backend
- **Lina** - Sécurité
- **Omar** - Data ingénieur

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**LudoKan** - *Votre bibliothèque de jeu vidéo*