import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCollectionGames } from "../hooks/useCollectionGames";
import { formatReleaseDate, getCoverUrl, type IgdbGame } from "../api/apiClient";

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="h-[96px] w-[72px] flex-none animate-pulse rounded-xl bg-zinc-200" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-zinc-200" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-zinc-200" />
        </div>
      </div>
    </div>
  );
}

function GameCard({ g }: { g: IgdbGame }) {
  const cover = getCoverUrl(g.cover);
  const release = formatReleaseDate(g.first_release_date);

  // si tu enrichis avec Wikidata, on préfère display_name
  const displayName = (g as any).display_name ?? g.name;

  return (
    <div className="group rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md">
      <div className="flex gap-3">
        <div className="h-[96px] w-[72px] flex-none overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          {cover ? (
            <img
              src={cover}
              alt=""
              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
              No cover
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-sm font-semibold text-zinc-900" title={g.name}>
            {displayName}
          </div>

          <div className="mt-1 text-xs text-zinc-500">
            {release ? `Sortie : ${release}` : "Date inconnue"}
          </div>

          {g.platforms?.length ? (
            <div className="mt-2 line-clamp-1 text-xs text-zinc-600">
              {g.platforms.slice(0, 3).map((p) => p.name).join(", ")}
              {g.platforms.length > 3 ? "…" : ""}
            </div>
          ) : (
            <div className="mt-2 text-xs text-zinc-400">Plateformes inconnues</div>
          )}

          {g.summary ? (
            <div className="mt-2 line-clamp-2 text-xs text-zinc-600">{g.summary}</div>
          ) : (
            <div className="mt-2 line-clamp-2 text-xs text-zinc-400">Pas de description.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LicensePage() {
  const { id } = useParams();
  const licenseId = Number(id);

  const [page, setPage] = useState(1);
  const pageSize = 48;

  const { games, loading, error } = useCollectionGames(licenseId, page, pageSize);

  // Titre “Licence” : on prend la collection de la 1ère entrée si dispo
  const title = useMemo(() => {
    const first: any = games?.[0];
    return first?.collections?.[0]?.name ?? `Licence #${licenseId}`;
  }, [games, licenseId]);

  const canPrev = page > 1 && !loading;
  const canNext = !loading && games.length === pageSize;

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to="/"
                className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                ← Retour
              </Link>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold text-zinc-900">{title}</h1>
                <div className="text-xs text-zinc-500">Licence • Page {page}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Précédent
            </button>

            <button
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant →
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-xs font-medium text-zinc-500">Licence</div>
              <div className="truncate text-xl font-bold text-zinc-900">{title}</div>
              <div className="mt-1 text-sm text-zinc-600">
                Parcours les jeux de la licence, triés par popularité (IGDB).
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
                {loading ? "…" : `${games.length} résultats`}
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-700">
                Page {page}
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Erreur : {error}
            </div>
          ) : null}
        </div>
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading
            ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
            : games.map((g) => <GameCard key={g.id} g={g} />)}
        </div>

        {!loading && !error && games.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
            Aucun jeu trouvé pour cette licence.
          </div>
        ) : null}

        {/* Bottom pagination */}
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Précédent
          </button>

          <div className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
            Page {page}
          </div>

          <button
            disabled={!canNext}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  );
}
