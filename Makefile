.PHONY: help \
	backend-format backend-lint \
	frontend-format frontend-lint \
	format lint format-all lint-all \
	test test-coverage \
	backend-install backend-migrate backend-makemigrations backend-run \
	frontend-install frontend-run \
	clean \
	docker-build docker-up docker-down docker-logs \
	install migrate migrations

# Couleurs pour l'affichage
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
PURPLE := \033[0;35m
NC := \033[0m # No Color

# Détection de docker compose / docker-compose
DC := $(shell if docker compose version >/dev/null 2>&1; then echo "docker compose"; elif command -v docker-compose >/dev/null 2>&1; then echo "docker-compose"; else echo "docker-compose"; fi)

help: ## Affiche cette aide
	@echo ""
	@echo "$(PURPLE)╔════════════════════════════════════════════╗$(NC)"
	@echo "$(PURPLE)║      LudoKan - Commandes Makefile         ║$(NC)"
	@echo "$(PURPLE)╚════════════════════════════════════════════╝$(NC)"
	@echo ""

	@echo "$(YELLOW)📦 Backend (Python)$(NC)"
	@grep -E '^backend-[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2}'
	@echo ""

	@echo "$(YELLOW)🖥️  Frontend (React)$(NC)"
	@grep -E '^frontend-[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2}'
	@echo ""

	@echo "$(YELLOW)🧪 Tests$(NC)"
	@grep -E '^test(-[a-zA-Z_-]+)?:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2}'
	@echo ""

	@echo "$(YELLOW)✨ Format & Lint (global)$(NC)"
	@grep -E '^(format|lint)[a-zA-Z_-]*:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2}'
	@echo ""

	@echo "$(YELLOW)🐳 Docker$(NC)"
	@grep -E '^docker-[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2}'
	@echo ""

	@echo "$(YELLOW)🧹 Divers / Utilitaires$(NC)"
	@grep -E '^(clean|install|migrate|migrations):.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-24s$(NC) %s\n", $$1, $$2}'
	@echo ""


# ============================================
# Backend - formatage & lint (Python)
# ============================================

backend-format: ## Formate le backend (Black + isort + Ruff --fix) dans Docker
	@echo "$(BLUE)🎨 Formatage du backend (black + isort + ruff)...$(NC)"
	@$(DC) exec -T web black /app
	@$(DC) exec -T web isort /app
	@$(DC) exec -T web ruff check /app --fix
	@echo "$(GREEN)✅ Backend formaté!$(NC)"

backend-lint: ## Vérifie le backend (Black, isort, Ruff, Flake8) dans Docker
	@echo "$(BLUE)🔍 Lint backend (black --check, isort --check, ruff, flake8)...$(NC)"
	@$(DC) exec -T web black /app --check --diff
	@$(DC) exec -T web isort /app --check-only --diff
	@$(DC) exec -T web ruff check /app
	@$(DC) exec -T web flake8 /app
	@echo "$(GREEN)✅ Backend conforme (lint OK)!$(NC)"

# Alias historiques
format: backend-format ## Alias: formate le backend Python
lint: backend-lint ## Alias: lint du backend Python

# ============================================
# Frontend - formatage & lint (JS/TS)
# ============================================

frontend-format: ## Formate le frontend (ESLint/Prettier via npm)
	@echo "$(BLUE)🎨 Formatage du frontend...$(NC)"
	@cd frontend && npm run lint -- --fix
	@echo "$(GREEN)✅ Frontend formaté!$(NC)"

frontend-lint: ## Vérifie le frontend (ESLint)
	@echo "$(BLUE)🔍 Lint du frontend...$(NC)"
	@cd frontend && npm run lint
	@echo "$(GREEN)✅ Frontend conforme (lint OK)!$(NC)"

# ============================================
# Global - format & lint
# ============================================

format-all: backend-format frontend-format ## Formate backend + frontend
	@echo "$(GREEN)🎉 Formatage global terminé!$(NC)"

lint-all: backend-lint frontend-lint ## Lint backend + frontend
	@echo "$(GREEN)🎉 Lint global terminé!$(NC)"

# ============================================
# Tests (dans Docker)
# ============================================

test: ## Exécute les tests backend dans Docker
	@echo "$(BLUE)🧪 Exécution des tests backend (docker)...$(NC)"
	@$(DC) exec -T web python run_tests.py

test-coverage: ## Exécute les tests backend avec couverture dans Docker
	@echo "$(BLUE)🧪 Exécution des tests backend avec couverture (docker)...$(NC)"
	@$(DC) exec -T web python run_tests.py --coverage

# ============================================
# Backend (via Docker)
# ============================================

backend-install: ## Construit l'image backend (install deps via Dockerfile)
	@echo "$(BLUE)📦 Build de l'image backend (web)...$(NC)"
	@$(DC) build web
	@echo "$(GREEN)✅ Image backend (web) à jour!$(NC)"

backend-migrate: ## Exécute les migrations Django dans Docker
	@echo "$(BLUE)🗄️ Exécution des migrations (docker)...$(NC)"
	@$(DC) exec -T web python manage.py migrate

backend-makemigrations: ## Crée les migrations Django dans Docker
	@echo "$(BLUE)🗄️ Création des migrations (docker)...$(NC)"
	@$(DC) exec -T web python manage.py makemigrations

migrate: backend-migrate ## Alias: make migrate
migrations: backend-makemigrations ## Alias: make migrations

backend-run: ## Lance les services backend (web + db + redis) via Docker
	@echo "$(BLUE)🚀 Démarrage des services backend (docker compose up)...$(NC)"
	@$(DC) up -d
	@echo "$(GREEN)✅ Services backend démarrés!$(NC)"

# ============================================
# Frontend
# ============================================

frontend-install: ## Installe les dépendances frontend
	@echo "$(BLUE)📦 Installation des dépendances frontend...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✅ Dépendances frontend installées!$(NC)"

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

docker-build: ## Construit toutes les images Docker
	@echo "$(BLUE)🐳 Construction des images Docker...$(NC)"
	@$(DC) build

docker-up: ## Lance tous les services Docker
	@echo "$(BLUE)🐳 Démarrage des services Docker...$(NC)"
	@$(DC) up -d

docker-down: ## Arrête tous les services Docker
	@echo "$(BLUE)🐳 Arrêt des services Docker...$(NC)"
	@$(DC) down

docker-logs: ## Affiche les logs Docker
	@$(DC) logs -f

# ============================================
# Installation complète
# ============================================

install: backend-install frontend-install ## Installation complète du projet
	@echo "$(GREEN)🎉 Installation complète terminée!$(NC)"
