#!/bin/sh
set -e

echo "🎯 Frontend pre-commit (staged files only)"

if [ "$#" -eq 0 ]; then
  echo "ℹ️  Aucun fichier frontend concerné, skip."
  exit 0
fi

echo "📄 Fichiers frontend stagés :"
for f in "$@"; do
  echo "  - $f"
done

# Construire la liste des fichiers relatifs à frontend/
FRONTEND_FILES=""
for path in "$@"; do
  # enlève le préfixe 'frontend/'
  rel="${path#frontend/}"
  FRONTEND_FILES="$FRONTEND_FILES $rel"
done

cd frontend

echo "🛠  ESLint + fix sur les fichiers stagés..."
# Adapte cette commande à ton script lint (eslint directement ou npm run lint:staged)
npx eslint --fix $FRONTEND_FILES

# Pas besoin de git add ici : lint-staged re-stagera automatiquement les fichiers modifiés
echo "✅ Frontend OK"
