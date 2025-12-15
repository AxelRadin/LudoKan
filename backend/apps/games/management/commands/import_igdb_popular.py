import datetime

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.games.igdb_client import igdb_request
from apps.games.models import Game, Genre, Platform, Publisher


class Command(BaseCommand):
    help = "Importe des jeux récents et populaires depuis IGDB (avec genres, plateformes, publishers, covers et status)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=500,
            help="Nombre de jeux à récupérer (max 500 par requête IGDB).",
        )
        parser.add_argument(
            "--from-year",
            type=int,
            default=2020,
            help="Année minimale de sortie (ex: 2020).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        limit = min(options["limit"], 500)  # IGDB max 500 par requête
        from_year = options["from_year"]

        self.stdout.write(self.style.MIGRATE_HEADING(f"Import IGDB : {limit} jeux populaires depuis {from_year}"))

        # 1) Importer / mettre à jour tous les genres + plateformes
        self.import_genres()
        self.import_platforms()

        # 2) Importer les jeux + publishers + covers + lier genres/plateformes
        self.import_games_and_publishers(limit, from_year)

    # ------------------------------------------------------------------
    # GENRES
    # ------------------------------------------------------------------
    def import_genres(self):
        self.stdout.write("\n=== Étape 1/3 : Import des genres ===")
        offset = 0
        page_size = 500
        total_count = 0

        while True:
            self.stdout.write(f"  → Requête genres (offset={offset}, limit={page_size})...")
            query = f"""
                fields id, name;
                limit {page_size};
                offset {offset};
                sort name asc;
            """

            data = igdb_request("genres", query)
            if not data:
                self.stdout.write("  → Aucun genre supplémentaire reçu, fin.")
                break

            for g in data:
                Genre.objects.update_or_create(
                    igdb_id=g["id"],
                    defaults={
                        "nom_genre": g["name"].strip(),
                        "description": "",
                    },
                )
                total_count += 1

            self.stdout.write(f"    ✓ {len(data)} genres traités dans ce batch ({total_count} au total).")

            if len(data) < page_size:
                self.stdout.write("  → Dernier batch de genres reçu.")
                break
            offset += page_size

        self.stdout.write(self.style.SUCCESS(f"✓ Genres importés / à jour : {total_count}"))

    # ------------------------------------------------------------------
    # PLATFORMS
    # ------------------------------------------------------------------
    def import_platforms(self):
        self.stdout.write("\n=== Étape 2/3 : Import des plateformes ===")
        offset = 0
        page_size = 500
        total_count = 0

        while True:
            self.stdout.write(f"  → Requête plateformes (offset={offset}, limit={page_size})...")
            query = f"""
                fields id, name;
                limit {page_size};
                offset {offset};
                sort name asc;
            """

            data = igdb_request("platforms", query)
            if not data:
                self.stdout.write("  → Aucune plateforme supplémentaire reçue, fin.")
                break

            for p in data:
                Platform.objects.update_or_create(
                    igdb_id=p["id"],
                    defaults={
                        "nom_plateforme": p["name"].strip(),
                        "description": "",
                    },
                )
                total_count += 1

            self.stdout.write(f"    ✓ {len(data)} plateformes traitées dans ce batch ({total_count} au total).")

            if len(data) < page_size:
                self.stdout.write("  → Dernier batch de plateformes reçu.")
                break
            offset += page_size

        self.stdout.write(self.style.SUCCESS(f"✓ Plateformes importées / à jour : {total_count}"))

    # ------------------------------------------------------------------
    # GAMES + PUBLISHERS + M2M + COVERS + STATUS
    # ------------------------------------------------------------------
    def import_games_and_publishers(self, limit: int, from_year: int):
        self.stdout.write("\n=== Étape 3/3 : Import des jeux populaires récents ===")

        from_dt, from_ts = self._compute_from_timestamp(from_year)

        query = self._build_games_query(limit, from_ts)

        self.stdout.write("  → Appel à l'API IGDB /games...")
        games_data = igdb_request("games", query)
        total_games = len(games_data)
        self.stdout.write(f"    ✓ {total_games} jeux reçus depuis IGDB.")

        if not games_data:
            self.stdout.write(self.style.WARNING("Aucun jeu reçu, arrêt de l'étape 3."))
            return

        involved_ids, cover_ids, age_rating_ids, mp_modes_ids = self._collect_related_ids(games_data)

        (
            involved_map,
            publishers_map,
            covers_map,
            age_ratings_map,
            mp_by_game,
        ) = self._build_related_maps(
            involved_ids,
            cover_ids,
            age_rating_ids,
            mp_modes_ids,
        )

        self._sync_games(
            games_data,
            involved_map,
            publishers_map,
            covers_map,
            age_ratings_map,
            mp_by_game,
        )

    def _compute_from_timestamp(self, from_year: int):
        """Retourne (datetime, timestamp) du 1er janvier de l'année donnée."""
        from_dt = datetime.datetime(from_year, 1, 1, tzinfo=datetime.timezone.utc)
        from_ts = int(from_dt.timestamp())
        self.stdout.write(f"  → Récupération des jeux avec first_release_date >= {from_dt.date()} " f"(timestamp {from_ts})")
        return from_dt, from_ts

    def _build_games_query(self, limit: int, from_ts: int) -> str:
        """Construit la requête IGDB pour récupérer les jeux."""
        # ⚠️ on n'utilise plus category (déprécié), juste date + version_parent
        return f"""
            fields
              id,
              name,
              summary,
              first_release_date,
              rating,
              aggregated_rating,
              total_rating,
              game_status,
              age_ratings,
              multiplayer_modes,
              cover,
              genres,
              platforms,
              involved_companies;
            where
              first_release_date != null &
              first_release_date >= {from_ts} &
              version_parent = null;
            sort total_rating desc;
            limit {limit};
        """

    def _collect_related_ids(self, games_data):
        """Collecte et déduplique les IDs liés aux jeux (companies, covers, ratings, modes)."""
        self.stdout.write("  → Collecte des IDs de involved_companies, covers, age_ratings, multiplayer_modes...")
        involved_ids = []
        cover_ids = []
        age_rating_ids = []
        mp_modes_ids = []

        for g in games_data:
            involved_ids.extend(g.get("involved_companies", []))
            cover_id = g.get("cover")
            if cover_id:
                cover_ids.append(cover_id)

            age_rating_ids.extend(g.get("age_ratings") or [])
            mp_modes_ids.extend(g.get("multiplayer_modes") or [])

        involved_ids = list(set(involved_ids))
        cover_ids = list(set(cover_ids))
        age_rating_ids = list(set(age_rating_ids))
        mp_modes_ids = list(set(mp_modes_ids))

        self.stdout.write(f"    ✓ {len(involved_ids)} IDs involved_companies uniques trouvés.")
        self.stdout.write(f"    ✓ {len(cover_ids)} IDs de covers uniques trouvés.")
        self.stdout.write(f"    ✓ {len(age_rating_ids)} IDs d'age_ratings uniques trouvés.")
        self.stdout.write(f"    ✓ {len(mp_modes_ids)} IDs de multiplayer_modes uniques trouvés.")

        return involved_ids, cover_ids, age_rating_ids, mp_modes_ids

    def _build_related_maps(
        self,
        involved_ids,
        cover_ids,
        age_rating_ids,
        mp_modes_ids,
    ):
        """
        Récupère toutes les entités liées (involved_companies, companies, publishers,
        covers, age_ratings, multiplayer_modes) et retourne les mappings utiles.
        """
        # 2) Récupérer involved_companies
        self.stdout.write("  → Récupération des involved_companies...")
        involved_map = self.fetch_involved_companies(involved_ids)
        self.stdout.write(f"    ✓ {len(involved_map)} involved_companies chargées.")

        # 3) IDs de companies (publishers uniquement)
        self.stdout.write("  → Extraction des IDs de companies (publishers)...")
        company_ids = {ic["company"] for ic in involved_map.values() if ic.get("publisher")}
        self.stdout.write(f"    ✓ {len(company_ids)} companies marquées comme publishers.")

        # 4) Récupérer les companies IGDB
        self.stdout.write("  → Récupération des companies publishers depuis IGDB...")
        companies_map = self.fetch_companies(list(company_ids))
        self.stdout.write(f"    ✓ {len(companies_map)} companies (publishers) récupérées.")

        # 5) Synchroniser les Publisher Django
        self.stdout.write("  → Synchronisation des Publisher Django...")
        publishers_map = self.ensure_publishers(companies_map)
        self.stdout.write(f"    ✓ {len(publishers_map)} Publisher Django synchronisés.")

        # 6) Récupérer les covers
        self.stdout.write("  → Récupération des covers depuis IGDB...")
        covers_map = self.fetch_covers(cover_ids)
        self.stdout.write(f"    ✓ {len(covers_map)} covers récupérées.")

        # 7) Récupérer les age_ratings
        self.stdout.write("  → Récupération des age_ratings depuis IGDB...")
        age_ratings_map = self.fetch_age_ratings(age_rating_ids)
        self.stdout.write(f"    ✓ {len(age_ratings_map)} age_ratings récupérés.")

        # 8) Récupérer les multiplayer_modes
        self.stdout.write("  → Récupération des multiplayer_modes depuis IGDB...")
        mp_modes_list = self.fetch_multiplayer_modes(mp_modes_ids)
        mp_by_game = self.index_multiplayer_by_game(mp_modes_list)
        self.stdout.write(f"    ✓ {len(mp_modes_list)} multiplayer_modes récupérés.")

        return involved_map, publishers_map, covers_map, age_ratings_map, mp_by_game

    def _sync_games(
        self,
        games_data,
        involved_map,
        publishers_map,
        covers_map,
        age_ratings_map,
        mp_by_game,
    ):
        """Crée / met à jour les jeux ainsi que leurs relations M2M."""
        self.stdout.write("  → Création / mise à jour des jeux et des relations M2M...")
        created = 0
        updated = 0
        error_count = 0
        total_games = len(games_data)

        for idx, g in enumerate(games_data, start=1):
            try:
                is_created = self._upsert_single_game(
                    g,
                    involved_map,
                    publishers_map,
                    covers_map,
                    age_ratings_map,
                    mp_by_game,
                )
                if is_created:
                    created += 1
                else:
                    updated += 1
            except Exception as e:
                error_count += 1
                self.stdout.write(self.style.ERROR(f"[ERREUR] Jeu IGDB {g.get('id')} - {g.get('name')}: {e}"))

            # Log de progression tous les 25 jeux, ou sur le dernier
            if idx % 25 == 0 or idx == total_games:
                self.stdout.write(
                    "    → Progression: " f"{idx}/{total_games} jeux traités " f"({created} créés, {updated} mis à jour, {error_count} erreurs)"
                )

        self.stdout.write(self.style.SUCCESS(f"✓ Jeux importés : {created} créés, {updated} mis à jour, {error_count} erreurs."))

    def _upsert_single_game(
        self,
        game_data,
        involved_map,
        publishers_map,
        covers_map,
        age_ratings_map,
        mp_by_game,
    ) -> bool:
        """Crée ou met à jour un jeu unique, retourne True si créé."""
        igdb_id = game_data["id"]
        name = game_data.get("name") or f"Game {igdb_id}"
        summary = game_data.get("summary") or ""

        # date de sortie
        first_release_ts = game_data.get("first_release_date")
        release_date = datetime.date.fromtimestamp(first_release_ts) if first_release_ts else None

        # status (enum déprécié mais encore utilisable)
        raw_status = game_data.get("game_status")
        status_str = self.map_status(raw_status)

        cover_url = self._compute_cover_url(game_data, covers_map)
        publisher_obj = self.find_publisher_for_game(game_data, involved_map, publishers_map)
        min_players, max_players = self.compute_player_counts(game_data, mp_by_game)
        min_age = self.compute_min_age(game_data, age_ratings_map)

        game_obj, is_created = Game.objects.update_or_create(
            igdb_id=igdb_id,
            defaults={
                "name": name,
                "description": summary,
                "release_date": release_date,
                # "popularity_score": popularity,
                "status": status_str,
                "cover_url": cover_url,
                "min_players": min_players,
                "max_players": max_players,
                "min_age": min_age,
                "publisher": publisher_obj,
            },
        )

        self._sync_game_relations(game_data, game_obj)
        return is_created

    def _compute_cover_url(self, game_data, covers_map):
        """Calcule l'URL de cover à partir des données IGDB."""
        cover_id = game_data.get("cover")
        if not cover_id:
            return None

        cover_data = covers_map.get(cover_id)
        if not cover_data:
            return None

        url = cover_data.get("url")
        if not url:
            return None

        # l'API renvoie souvent une URL sans protocole, ex: //images.igdb.com/...
        if url.startswith("//"):
            return "https:" + url
        return url

    def _sync_game_relations(self, game_data, game_obj):
        """Met à jour les relations M2M (plateformes, genres) pour un jeu."""
        # lier plateformes
        platform_ids = game_data.get("platforms") or []
        if platform_ids:
            platforms = Platform.objects.filter(igdb_id__in=platform_ids)
            game_obj.platforms.set(platforms)
        else:
            game_obj.platforms.clear()

        # lier genres
        genre_ids = game_data.get("genres") or []
        if genre_ids:
            genres = Genre.objects.filter(igdb_id__in=genre_ids)
            game_obj.genres.set(genres)
        else:
            game_obj.genres.clear()

    # ------------------------------------------------------------------
    # Helpers: involved_companies / companies / publishers / covers / status
    # ------------------------------------------------------------------
    def fetch_involved_companies(self, ids):
        if not ids:
            self.stdout.write("    (Aucun involved_company à récupérer)")
            return {}

        result = {}
        unique_ids = list(set(ids))
        chunks = [unique_ids[i : i + 500] for i in range(0, len(unique_ids), 500)]

        for idx, chunk in enumerate(chunks, start=1):
            self.stdout.write(f"    → Batch involved_companies {idx}/{len(chunks)} (taille={len(chunk)})")
            ids_str = ",".join(str(i) for i in chunk)
            query = f"""
                fields id, game, company, developer, publisher;
                where id = ({ids_str});
                limit 500;
            """
            data = igdb_request("involved_companies", query)
            for ic in data:
                result[ic["id"]] = ic

        return result

    def fetch_companies(self, ids):
        if not ids:
            self.stdout.write("    (Aucune company à récupérer)")
            return {}

        result = {}
        unique_ids = list(set(ids))
        chunks = [unique_ids[i : i + 500] for i in range(0, len(unique_ids), 500)]

        for idx, chunk in enumerate(chunks, start=1):
            self.stdout.write(f"    → Batch companies {idx}/{len(chunks)} (taille={len(chunk)})")
            ids_str = ",".join(str(i) for i in chunk)
            query = f"""
                fields id, name, description;
                where id = ({ids_str});
                limit 500;
            """
            data = igdb_request("companies", query)
            for c in data:
                result[c["id"]] = c

        return result

    def fetch_covers(self, ids):
        """
        Retourne un dict {id: cover}
        """
        if not ids:
            self.stdout.write("    (Aucune cover à récupérer)")
            return {}

        result = {}
        unique_ids = list(set(ids))
        chunks = [unique_ids[i : i + 500] for i in range(0, len(unique_ids), 500)]

        for idx, chunk in enumerate(chunks, start=1):
            self.stdout.write(f"    → Batch covers {idx}/{len(chunks)} (taille={len(chunk)})")
            ids_str = ",".join(str(i) for i in chunk)
            query = f"""
                fields id, url, image_id;
                where id = ({ids_str});
                limit 500;
            """
            data = igdb_request("covers", query)
            for c in data:
                result[c["id"]] = c

        return result

    def ensure_publishers(self, companies_map):
        mapping = {}
        count_created = 0
        count_updated = 0

        for comp_id, comp in companies_map.items():
            name = comp["name"].strip()
            description = comp.get("description") or ""

            publisher_obj, created = Publisher.objects.update_or_create(
                igdb_id=comp_id,
                defaults={
                    "name": name,
                    "description": description,
                    "website": None,
                },
            )
            mapping[comp_id] = publisher_obj

            if created:
                count_created += 1
            else:
                count_updated += 1

        self.stdout.write(f"    ✓ Publishers Django: {count_created} créés, {count_updated} mis à jour.")
        return mapping

    def find_publisher_for_game(self, game_data, involved_map, publishers_map):
        default_publisher, _ = Publisher.objects.get_or_create(
            name="Unknown publisher",
            defaults={
                "description": "Éditeur inconnu (données IGDB partielles).",
                "website": None,
            },
        )

        for ic_id in game_data.get("involved_companies", []) or []:
            ic = involved_map.get(ic_id)
            if not ic:
                continue
            if ic.get("publisher"):
                comp_id = ic["company"]
                return publishers_map.get(comp_id, default_publisher)

        return default_publisher

    def map_status(self, value):
        """
        Mappe l'entier IGDB `status` vers la string qu'on stocke dans Game.status.
        """
        status_map = {
            0: "released",
            2: "alpha",
            3: "beta",
            4: "early_access",
            5: "offline",
            6: "cancelled",
            7: "rumored",
            8: "delisted",
        }
        if value is None:
            return None
        return status_map.get(value)

    def fetch_age_ratings(self, ids):
        """
        Retourne un dict {id: age_rating}
        """
        if not ids:
            self.stdout.write("    (Aucun age_rating à récupérer)")
            return {}

        result = {}
        unique_ids = list(set(ids))
        chunks = [unique_ids[i : i + 500] for i in range(0, len(unique_ids), 500)]

        for idx, chunk in enumerate(chunks, start=1):
            self.stdout.write(f"    → Batch age_ratings {idx}/{len(chunks)} (taille={len(chunk)})")
            ids_str = ",".join(str(i) for i in chunk)
            query = f"""
                fields id, category, rating;
                where id = ({ids_str});
                limit 500;
            """
            data = igdb_request("age_ratings", query)
            for ar in data:
                result[ar["id"]] = ar

        return result

    def fetch_multiplayer_modes(self, ids):
        """
        Retourne une liste de multiplayer_modes bruts
        """
        if not ids:
            self.stdout.write("    (Aucun multiplayer_mode à récupérer)")
            return []

        result = []
        unique_ids = list(set(ids))
        chunks = [unique_ids[i : i + 500] for i in range(0, len(unique_ids), 500)]

        for idx, chunk in enumerate(chunks, start=1):
            self.stdout.write(f"    → Batch multiplayer_modes {idx}/{len(chunks)} (taille={len(chunk)})")
            ids_str = ",".join(str(i) for i in chunk)
            query = f"""
                fields
                id,
                game,
                offlinemax,
                onlinemax,
                offlinecoopmax,
                onlinecoopmax,
                offlinecoop,
                onlinecoop,
                campaigncoop;
                where id = ({ids_str});
                limit 500;
            """
            data = igdb_request("multiplayer_modes", query)
            result.extend(data)

        return result

    def index_multiplayer_by_game(self, mp_list):
        """
        Retourne {game_id: [multiplayer_mode, ...]}
        """
        by_game = {}
        for mp in mp_list:
            game_id = mp.get("game")
            if not game_id:
                continue
            by_game.setdefault(game_id, []).append(mp)
        return by_game

    def compute_min_age(self, game_data, age_ratings_map):
        """
        Calcule un min_age approximatif à partir des age_ratings IGDB.
        On prend le plus petit âge repéré (PEGI / ESRB).
        """
        rating_ids = game_data.get("age_ratings") or []
        if not rating_ids:
            return None

        ages = []

        # Quelques mappings connus de IGDB :
        # category 1: ESRB, category 2: PEGI
        # (les valeurs de 'rating' sont documentées dans l'API IGDB)
        pegi_map = {
            # exemples: à ajuster au besoin selon la doc exacte
            1: 3,  # PEGI 3
            2: 7,  # PEGI 7
            3: 12,  # PEGI 12
            4: 16,  # PEGI 16
            5: 18,  # PEGI 18
        }
        esrb_map = {
            # exemples: à ajuster, mais en gros :
            2: 6,  # E (Everyone)
            3: 10,  # E10+
            4: 13,  # T
            5: 17,  # M
            6: 18,  # AO
        }

        for rid in rating_ids:
            ar = age_ratings_map.get(rid)
            if not ar:
                continue
            cat = ar.get("category")
            rating_code = ar.get("rating")

            if cat == 2:  # PEGI
                age = pegi_map.get(rating_code)
                if age:
                    ages.append(age)
            elif cat == 1:  # ESRB
                age = esrb_map.get(rating_code)
                if age:
                    ages.append(age)

        if not ages:
            return None
        return min(ages)

    def compute_player_counts(self, game_data, mp_by_game):
        """
        Calcule min_players / max_players à partir des multiplayer_modes.
        Heuristique:
        - max_players = max(offlinemax, onlinemax, offlinecoopmax, onlinecoopmax)
        - min_players = 2 si coop présent, sinon 1
        """
        game_id = game_data["id"]
        modes = mp_by_game.get(game_id, [])
        if not modes:
            return None, None

        candidates_max = []
        for m in modes:
            for key in ("offlinemax", "onlinemax", "offlinecoopmax", "onlinecoopmax"):
                v = m.get(key)
                if v:
                    candidates_max.append(v)

        if not candidates_max:
            return None, None

        max_players = max(candidates_max)

        # heuristique pour min_players
        min_players = 1
        for m in modes:
            if m.get("offlinecoop") or m.get("onlinecoop") or m.get("campaigncoop"):
                min_players = 2
                break

        return min_players, max_players
