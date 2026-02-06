#!/bin/sh
set -e

echo "🎯 Frontend pre-commit (staged files only)"

if [ "$#" -eq 0 ]; then
  echo "ℹ️  Aucun fichier frontend concerné, skip."
  exit 0
fi


# Construire la liste des fichiers relatifs à frontend/
FRONTEND_FILES=""
for path in "$@"; do
  case "$path" in
    frontend/*)
      rel="${path#frontend/}"
      ;;
    ./frontend/*)
      rel="${path#./frontend/}"
      ;;
    *)
      # Si jamais lint-staged envoie déjà un chemin relatif
      rel="$path"
      ;;
  esac

  FRONTEND_FILES="$FRONTEND_FILES $rel"
done

echo ""
echo "📄 Fichiers vus depuis ./frontend :"
for f in $FRONTEND_FILES; do
  echo "  - $f"
done

cd frontend

echo ""
echo "🛠  ESLint --fix sur les fichiers stagés..."
if ! npx eslint --fix $FRONTEND_FILES; then
  echo ""
  echo "❌ ESLint n'a pas pu corriger toutes les erreurs et le hook pre-commit s'est arrêté."
  echo "   Regarde les messages d'erreur ci-dessus, corrige le code puis :"
  echo "     - Corrige les erreurs ESLint,"
  echo "     - ⚠️ n'oublie pas de  'add' ce que tu as corrigé,"
  echo "     - puis relance ton commit."
  exit 1
fi



echo ""
echo "🎨 Prettier --write sur les fichiers stagés..."
npx prettier --write $FRONTEND_FILES

# ⚠️ IMPORTANT :
# - Si ce script est appelé via `lint-staged`,
#   NE PAS refaire `git add` ici : lint-staged s’en charge.
# - Si tu appelles ce script directement depuis Husky (sans lint-staged),
#   tu peux décommenter le bloc ci-dessous :

# echo ""
# echo "➕ Re-stage des fichiers modifiés..."
# cd ..  # revenir à la racine du repo
# for path in "$@"; do
#   echo "  git add $path"
#   git add "$path"
# done

echo ""
echo "✅ Frontend OK (lint + format appliqués sur les fichiers stagés)"
