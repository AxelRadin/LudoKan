## Base de données Postgres Render — Guide et commandes sécurisées

Ce document décrit comment administrer la base Postgres hébergée sur Render en évitant d’exposer des informations sensibles (mot de passe, URL complète).


### Prérequis

- Avoir `psql` installé (PostgreSQL client).
- Accès au dashboard Render pour récupérer les identifiants de la base (Host, Database, User, Password, Port).


### Récupérer les identifiants Render

Dans Render, ouvrez votre instance Postgres puis copiez :

- Host (ex. `dpg-xxxxx.oregon-postgres.render.com`)
- Database (ex. `ludokan`)
- User (ex. `ludomako`)
- Password (mot de passe)
- Port (généralement `5432`)


### Exporter les identifiants dans l’environnement (recommandé)

Ne tapez jamais votre mot de passe en clair dans l’historique. Exportez plutôt des variables d’environnement (dans un terminal) :

```bash
export RENDER_PGHOST="<host_render>"
export RENDER_PGDATABASE="<database_render>"
export RENDER_PGUSER="<user_render>"
export RENDER_PGPORT="${RENDER_PGPORT:-5432}"
# Le mot de passe en mémoire du shell uniquement (non écrit dans un fichier)
read -s -p "Render DB password: " RENDER_PGPASSWORD && echo
```

Astuce : si votre shell supporte `HISTCONTROL=ignorespace`, commencez les commandes sensibles par un espace pour éviter leur enregistrement dans l’historique.


### Réinitialiser le schéma `public` (DANGER)

Cette opération supprime toutes les tables/données du schéma `public`. À n’exécuter que si vous êtes certain(e) de vouloir repartir de zéro.

Option 1 — One‑liner avec variables d’environnement (le mot de passe n’apparaît pas en clair dans la commande) :

```bash
PGPASSWORD="${RENDER_PGPASSWORD:?}" \
psql -h "$RENDER_PGHOST" \
     -U "$RENDER_PGUSER" \
     -d "$RENDER_PGDATABASE" \
     -v ON_ERROR_STOP=1 \
     -c "DROP SCHEMA IF EXISTS public CASCADE;
         CREATE SCHEMA public AUTHORIZATION \"$RENDER_PGUSER\";
         GRANT ALL ON SCHEMA public TO \"$RENDER_PGUSER\";
         GRANT ALL ON SCHEMA public TO public;"
```

Option 2 — Via un fichier SQL temporaire et un paramètre (plus lisible) :

```bash
cat > /tmp/reset_public_schema.sql <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public AUTHORIZATION :dbuser;
GRANT ALL ON SCHEMA public TO :dbuser;
GRANT ALL ON SCHEMA public TO public;
SQL

PGPASSWORD="${RENDER_PGPASSWORD:?}" \
psql -h "$RENDER_PGHOST" \
     -U "$RENDER_PGUSER" \
     -d "$RENDER_PGDATABASE" \
     -v ON_ERROR_STOP=1 \
     -v dbuser="$RENDER_PGUSER" \
     -f /tmp/reset_public_schema.sql
```


### Alternative : utiliser `~/.pgpass` (pas de mot de passe dans les commandes)

Vous pouvez stocker le mot de passe dans `~/.pgpass` (droits `600`) pour éviter de le renseigner à chaque fois :

```bash
echo "$RENDER_PGHOST:$RENDER_PGPORT:$RENDER_PGDATABASE:$RENDER_PGUSER:$RENDER_PGPASSWORD" >> ~/.pgpass
chmod 600 ~/.pgpass

# Ensuite vous pouvez appeler psql sans PGPASSWORD=…
psql -h "$RENDER_PGHOST" -U "$RENDER_PGUSER" -d "$RENDER_PGDATABASE" -c '\dt'
```

Attention : `~/.pgpass` contient un secret en clair. Assurez‑vous qu’il est protégé et ne le commitez jamais.


### Remise en route de l’application après reset

Après avoir recréé le schéma, rejouez les migrations depuis la racine du backend :

```bash
cd backend
python manage.py migrate --noinput
```

Le projet peut aussi utiliser une URL `DATABASE_URL` (Django). Dans ce cas, exportez‑la depuis le dashboard Render puis relancez l’app/migrations en conséquence.


### Exemple de commande anonymisée (placeholders)

Si vous devez partager une commande sans exposer de secrets, utilisez des placeholders :

```bash
PGPASSWORD="***" \
psql -h "<host>.render.com" \
     -U "<user>" \
     -d "<database>" \
     -v ON_ERROR_STOP=1 \
     -c "DROP SCHEMA IF EXISTS public CASCADE;
         CREATE SCHEMA public AUTHORIZATION <user>;
         GRANT ALL ON SCHEMA public TO <user>;
         GRANT ALL ON SCHEMA public TO public;"
```

Remplacez `<host>`, `<user>`, `<database>` lors de l’exécution, ou utilisez les variables d’environnement décrites plus haut.


### Bonnes pratiques de sécurité

- Ne collez jamais le mot de passe en clair dans une commande enregistrée dans l’historique.
- Préférez les variables d’environnement ou `~/.pgpass` (protégé en `600`).
- Ne commitez jamais d’identifiants dans le dépôt Git.
- Vérifiez que vous ciblez la bonne base et le bon environnement avant toute suppression.


### Sauvegarder (dump) la base de données

Crée un fichier de sauvegarde compressé au format personnalisé (`-Fc`), idéal pour `pg_restore`.

Option 1 — Version sécurisée (variables d’environnement, pas de secret en clair dans la commande) :

```bash
# Prérequis: exportez déjà vos variables RENDER_* (voir section plus haut)
DUMP_NAME="ludokan_$(date +%F).dump"

docker run --rm \
  -e PGPASSWORD="$RENDER_PGPASSWORD" \
  -e PGHOST="$RENDER_PGHOST" \
  -e PGPORT="${RENDER_PGPORT:-5432}" \
  -e PGUSER="$RENDER_PGUSER" \
  -e PGDATABASE="$RENDER_PGDATABASE" \
  -e DUMP_NAME="$DUMP_NAME" \
  -v "$PWD:/dump" postgres:17 bash -lc '
    pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
      -Fc -Z 6 -f "/dump/$DUMP_NAME"
  '

echo "Fichier créé : $DUMP_NAME"
```

Option 2 — Commande fournie (mettez des placeholders pour ne pas exposer le mot de passe) :

```bash
DUMP_NAME="ludokan_$(date +%F).dump"

docker run --rm -v "$PWD:/dump" postgres:17 bash -lc '
  export PGPASSWORD="***"; # Renseignez le mot de passe au moment de l’exécution
  pg_dump -h <host>.oregon-postgres.render.com -p 5432 -U <user> -d <database> \
    -Fc -Z 6 -f /dump/'"$DUMP_NAME"'
'

echo "Fichier créé : $DUMP_NAME"
```

Remplacez `<host>`, `<user>`, `<database>` ou utilisez la version sécurisée (Option 1) avec `RENDER_*` déjà exportées.


