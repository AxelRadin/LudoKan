#!/usr/bin/env sh
set -eu

# Synchronise les catalogues i18n sans bruit Git inutile.
# - Génère/maj les .po pour les langues ciblées.
# - Supprime les références de ligne (--no-location).
# - Stabilise POT-Creation-Date pour éviter des diffs temporels.

LANGUAGES="${I18N_LANGUAGES:-fr en}"

cd /app 2>/dev/null || cd "$(dirname "$0")/.."

mkdir -p locale

LANG_ARGS=""
for lang in $LANGUAGES; do
  LANG_ARGS="$LANG_ARGS -l $lang"
done

# shellcheck disable=SC2086
python manage.py makemessages $LANG_ARGS --no-location -i .venv -i env

for po_file in locale/*/LC_MESSAGES/django.po; do
  [ -f "$po_file" ] || continue
  # Normalise l'entête volatile générée par gettext.
  sed -i.bak 's/^"POT-Creation-Date: .*\\n"$/"POT-Creation-Date: 1970-01-01 00:00+0000\\n"/' "$po_file"
  rm -f "${po_file}.bak"
done

echo "i18n sync complete for languages: $LANGUAGES"
