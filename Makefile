.PHONY: help setup-precommit precommit precommit-all format lint test clean

# Couleurs pour l'affichage
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

# Détection de docker compose / docker-compose
DC := $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo "docker-compose"; fi)

help: ## Affiche cette aide
	@echo "$(BLUE)LudoKan - Commandes disponibles:$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================
# Pre-commit hooks
# ============================================

setup-precommit: ## Installe les pre-commit hooks (Docker)
	@echo "$(BLUE)📦 Installation de pre-commit...$(NC)"
	@pip install pre-commit==3.5.0
	@echo "$(BLUE)🪝 Installation des hooks Git...$(NC)"
	@pre-commit install
	@echo "$(GREEN)✅ Pre-commit installé avec succès!$(NC)"
	@echo "$(YELLOW)⚠️  N'oubliez pas de démarrer Docker: make docker-up$(NC)"

precommit: ## Exécute pre-commit sur les fichiers staged (nécessite Docker)
	@echo "$(BLUE)🔍 Exécution de pre-commit...$(NC)"
	@if ! $(DC) ps | grep -q "web.*Up"; then \
		echo "$(YELLOW)⚠️  Le conteneur 'web' n'est pas démarré. Lancement...$(NC)"; \
		$(DC) up -d; \
		sleep 5; \
	fi
	@pre-commit run

precommit-all: ## Exécute pre-commit sur tous les fichiers (nécessite Docker)
	@echo "$(BLUE)🔍 Exécution de pre-commit sur tous les fichiers...$(NC)"
	@if ! $(DC) ps | grep -q "web.*Up"; then \
		echo "$(YELLOW)⚠️  Le conteneur 'web' n'est pas démarré. Lancement...$(NC)"; \
		$(DC) up -d; \
		sleep 5; \
	fi
	@pre-commit run --all-files

precommit-update: ## Met à jour les hooks pre-commit
	@echo "$(BLUE)🔄 Mise à jour de pre-commit...$(NC)"
	@pre-commit autoupdate

# ============================================
# Formatage et linting
# ============================================

format: ## Formate le code Python (Black + isort) dans Docker
	@echo "$(BLUE)🎨 Formatage du code dans Docker...$(NC)"
	@$(DC) exec -T web black /app
	@$(DC) exec -T web isort /app
	@echo "$(GREEN)✅ Code formaté!$(NC)"

lint: ## Vérifie le code (Black, isort, Flake8) dans Docker
	@echo "$(BLUE)🔍 Vérification du code dans Docker...$(NC)"
	@$(DC) exec -T web black /app --check --diff
	@$(DC) exec -T web isort /app --check-only --diff
	@$(DC) exec -T web flake8 /app
	@echo "$(GREEN)✅ Code vérifié!$(NC)"

# ============================================
# Tests
# ============================================

test: ## Exécute les tests backend
	@echo "$(BLUE)🧪 Exécution des tests...$(NC)"
	@cd backend && python run_tests.py

test-coverage: ## Exécute les tests avec couverture
	@echo "$(BLUE)🧪 Exécution des tests avec couverture...$(NC)"
	@cd backend && python run_tests.py --coverage

# ============================================
# Backend
# ============================================

backend-install: ## Installe les dépendances backend
	@echo "$(BLUE)📦 Installation des dépendances backend...$(NC)"
	@cd backend && pip install -r requirements.txt
	@cd backend && pip install -r requirements-dev.txt
	@echo "$(GREEN)✅ Dépendances installées!$(NC)"

backend-migrate: ## Exécute les migrations Django
	@echo "$(BLUE)🗄️ Exécution des migrations...$(NC)"
	@cd backend && python manage.py migrate

backend-run: ## Lance le serveur Django
	@echo "$(BLUE)🚀 Démarrage du serveur Django...$(NC)"
	@cd backend && python manage.py runserver

# ============================================
# Frontend
# ============================================

frontend-install: ## Installe les dépendances frontend
	@echo "$(BLUE)📦 Installation des dépendances frontend...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✅ Dépendances installées!$(NC)"

frontend-run: ## Lance le serveur de développement frontend
	@echo "$(BLUE)🚀 Démarrage du serveur frontend...$(NC)"
	@cd frontend && npm run dev

# ============================================
# Nettoyage
# ============================================

clean: ## Nettoie les fichiers temporaires
	@echo "$(BLUE)🧹 Nettoyage des fichiers temporaires...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".coverage" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)✅ Nettoyage terminé!$(NC)"

# ============================================
# Docker
# ============================================

docker-build: ## Construit les images Docker
	@echo "$(BLUE)🐳 Construction des images Docker...$(NC)"
	@$(DC) build

docker-up: ## Lance les services Docker
	@echo "$(BLUE)🐳 Démarrage des services Docker...$(NC)"
	@$(DC) up -d

docker-down: ## Arrête les services Docker
	@echo "$(BLUE)🐳 Arrêt des services Docker...$(NC)"
	@$(DC) down

docker-logs: ## Affiche les logs Docker
	@$(DC) logs -f

# ============================================
# Installation complète
# ============================================

install: backend-install frontend-install setup-precommit ## Installation complète du projet
	@echo "$(GREEN)🎉 Installation complète terminée!$(NC)"
