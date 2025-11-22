#!/bin/sh
set -e

echo "🎯 Backend pre-commit (staged Python files only)"

if [ "$#" -eq 0 ]; then
  echo "ℹ️  Aucun fichier backend Python concerné, skip."
  exit 0
fi

# echo "📄 Fichiers backend stagés (bruts) :"
# for f in "$@"; do
#   echo "  - $f"
# done

# Racine du repo (ex: /Users/.../LudoKan)
REPO_ROOT="$(git rev-parse --show-toplevel)"

# Normaliser les chemins en chemins relatifs au repo (backend/...)
BACKEND_REL_FILES=""
for path in "$@"; do
  case "$path" in
    "$REPO_ROOT"/*)
      rel="${path#"$REPO_ROOT"/}"
      ;;
    ./*)
      rel="${path#./}"
      ;;
    *)
      rel="$path"
      ;;
  esac

  BACKEND_REL_FILES="$BACKEND_REL_FILES $rel"
done

echo ""
# echo "📄 Fichiers backend (repo-relative) :"
# for f in $BACKEND_REL_FILES; do
#   echo "  - $f"
# done

# Détecter docker compose / docker-compose
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "❌ Ni 'docker compose' ni 'docker-compose' trouvés. Impossible de lancer les checks backend."
  exit 1
fi

# Vérifier que le conteneur web est up
if ! $DC ps | grep -q "web.*Up"; then
  echo "❌ Le conteneur 'web' n'est pas démarré."
  echo "   Lance d'abord : $DC up -d"
  exit 1
fi

# Construire les chemins tels qu'ils existent dans le conteneur
# Sur l’hôte: backend/api/apps.py → dans le conteneur (WORKDIR=/app): api/apps.py
CONTAINER_REL_FILES=""
for rel in $BACKEND_REL_FILES; do
  case "$rel" in
    backend/*)
      in_container="${rel#backend/}"
      ;;
    *)
      in_container="$rel"
      ;;
  esac
  CONTAINER_REL_FILES="$CONTAINER_REL_FILES $in_container"
done

echo ""
# echo "📄 Fichiers vus dans le conteneur (relatifs à /app) :"
# for f in $CONTAINER_REL_FILES; do
#   echo "  - $f"
# done
echo ""
echo "🛠  Formatage backend (black) sur fichiers stagés..."
$DC exec -T web black $CONTAINER_REL_FILES

BLACK_COUNT=$(git diff --name-only -- $BACKEND_REL_FILES | wc -l | tr -d ' ')
if [ "$BLACK_COUNT" -gt 0 ]; then
  echo "✨ Black a formaté $BLACK_COUNT fichier(s) backend."
  # Re-stager les fichiers modifiés par black
  git add $BACKEND_REL_FILES
else
  echo "✨ Aucun changement par black (déjà clean)."
fi

echo ""
echo "🛠  Tri des imports (isort) sur fichiers stagés..."
$DC exec -T web isort $CONTAINER_REL_FILES

ISORT_COUNT=$(git diff --name-only -- $BACKEND_REL_FILES | wc -l | tr -d ' ')
if [ "$ISORT_COUNT" -gt 0 ]; then
  echo "✨ Isort a trié les imports de $ISORT_COUNT fichier(s) backend."
  # Re-stager les fichiers modifiés par isort
  git add $BACKEND_REL_FILES
else
  echo "✨ Aucun changement par isort (déjà clean)."
fi

echo ""
echo "🛠  Ruff (auto-fix) sur fichiers stagés..."
# Ruff utilise la config de pyproject.toml (/app/pyproject.toml)
$DC exec -T web ruff check --fix $CONTAINER_REL_FILES

RUFF_COUNT=$(git diff --name-only -- $BACKEND_REL_FILES | wc -l | tr -d ' ')
if [ "$RUFF_COUNT" -gt 0 ]; then
  echo "✨ Ruff a corrigé automatiquement $RUFF_COUNT fichier(s) backend."
  # Re-stager les fichiers modifiés par ruff
  git add $BACKEND_REL_FILES
else
  echo "✨ Aucun changement par ruff (déjà clean)."
fi


echo ""
echo "🔎 Lint backend (flake8) sur fichiers stagés..."
if ! $DC exec -T web flake8 $CONTAINER_REL_FILES; then
  echo ""
  echo "❌ Flake8 a détecté des erreurs dans les fichiers backend ci-dessus."
  echo "   Corrige-les (regarde les messages juste au-dessus) puis refais un commit."
  exit 1
fi

echo "✅ Backend OK"
