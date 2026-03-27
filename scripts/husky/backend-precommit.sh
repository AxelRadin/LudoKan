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

# Préférer Docker si le conteneur web est up, sinon exécution locale (backend/ + venv ou PATH)
USE_DOCKER=false
DC=""
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
fi
if [ -n "$DC" ] && $DC ps 2>/dev/null | grep -q "web.*Up"; then
  USE_DOCKER=true
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

run_black() {
  if [ "$USE_DOCKER" = true ]; then
    $DC exec -T web black $CONTAINER_REL_FILES
  else
    (cd "$REPO_ROOT/backend" && black $CONTAINER_REL_FILES)
  fi
}
run_isort() {
  if [ "$USE_DOCKER" = true ]; then
    $DC exec -T web isort $CONTAINER_REL_FILES
  else
    (cd "$REPO_ROOT/backend" && isort $CONTAINER_REL_FILES)
  fi
}
run_ruff() {
  if [ "$USE_DOCKER" = true ]; then
    $DC exec -T web ruff check --fix $CONTAINER_REL_FILES
  else
    (cd "$REPO_ROOT/backend" && ruff check --fix $CONTAINER_REL_FILES)
  fi
}
run_flake8() {
  if [ "$USE_DOCKER" = true ]; then
    $DC exec -T web flake8 $CONTAINER_REL_FILES
  else
    (cd "$REPO_ROOT/backend" && flake8 $CONTAINER_REL_FILES)
  fi
}

if [ "$USE_DOCKER" = true ]; then
  echo "🐳 Utilisation du conteneur Docker 'web'"
else
  echo "💻 Docker non démarré → exécution locale (backend/ avec venv ou PATH)"
  for cmd in black isort ruff flake8; do
    if ! command -v $cmd >/dev/null 2>&1; then
      echo "❌ Commande '$cmd' introuvable. Lance 'docker compose up -d' ou active le venv backend."
      exit 1
    fi
  done
fi
echo ""

echo "🛠  Formatage backend (black) sur fichiers stagés..."
run_black

BLACK_COUNT=$(git diff --name-only -- $BACKEND_REL_FILES | wc -l | tr -d ' ')
if [ "$BLACK_COUNT" -gt 0 ]; then
  echo "✨ Black a formaté $BLACK_COUNT fichier(s) backend."
  # Re-stager les fichiers modifiés par black
  git add -- $BACKEND_REL_FILES

else
  echo "✨ Aucun changement par black (déjà clean)."
fi

echo ""
echo "🛠  Tri des imports (isort) sur fichiers stagés..."
run_isort

ISORT_COUNT=$(git diff --name-only -- $BACKEND_REL_FILES | wc -l | tr -d ' ')
if [ "$ISORT_COUNT" -gt 0 ]; then
  echo "✨ Isort a trié les imports de $ISORT_COUNT fichier(s) backend."
  # Re-stager les fichiers modifiés par isort
  git add -- $BACKEND_REL_FILES

else
  echo "✨ Aucun changement par isort (déjà clean)."
fi

echo ""
echo "🛠  Ruff (auto-fix) sur fichiers stagés..."
run_ruff

RUFF_COUNT=$(git diff --name-only -- $BACKEND_REL_FILES | wc -l | tr -d ' ')
if [ "$RUFF_COUNT" -gt 0 ]; then
  echo "✨ Ruff a corrigé automatiquement $RUFF_COUNT fichier(s) backend."
  # Re-stager les fichiers modifiés par ruff
  git add -- $BACKEND_REL_FILES

else
  echo "✨ Aucun changement par ruff (déjà clean)."
fi


echo ""
echo "🔎 Lint backend (flake8) sur fichiers stagés..."
if ! run_flake8; then
  echo ""
  echo "❌ Flake8 a détecté des erreurs dans les fichiers backend ci-dessus."
  echo "   Corrige-les (regarde les messages juste au-dessus) puis refais un commit."
  exit 1
fi

echo "✅ Backend OK"
