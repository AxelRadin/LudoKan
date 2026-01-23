import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useFranchiseGames } from "../hooks/useFranchiseGames";
import { getCoverUrl, formatReleaseDate, type IgdbGame } from "../api/apiClient";

export default function FranchisePage() {
  const params = useParams();
  const franchiseId = Number(params.id);

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { games, loading, error } = useFranchiseGames(franchiseId, page, pageSize);

  const title = useMemo(() => {
    const g = games?.[0] as any;
    return g?.franchises?.[0]?.name ?? `Franchise #${franchiseId}`;
  }, [games, franchiseId]);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Page {page}</div>
        </div>

        <Link to="/" style={{ fontSize: 14 }}>
          ← Retour
        </Link>
      </div>

      <div style={{ height: 12 }} />

      {loading && <div>Chargement…</div>}
      {error && <div style={{ color: "crimson" }}>Erreur : {error}</div>}

      {!loading && !error && games.length === 0 && <div>Aucun jeu trouvé.</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {games.map((g: IgdbGame) => {
          const cover = getCoverUrl(g.cover);
          const release = formatReleaseDate(g.first_release_date);
          return (
            <div
              key={g.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                gap: 12,
                background: "white",
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 76,
                  borderRadius: 10,
                  border: "1px solid #eee",
                  overflow: "hidden",
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                {cover ? (
                  <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  "—"
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(g as any).display_name ?? g.name}
                </div>

                {release ? <div style={{ fontSize: 12, opacity: 0.75 }}>Sortie : {release}</div> : null}

                {g.platforms?.length ? (
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {g.platforms.slice(0, 3).map((p) => p.name).join(", ")}
                    {g.platforms.length > 3 ? "…" : ""}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 16 }} />

      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ← Précédent
        </button>

        <button disabled={loading || games.length < pageSize} onClick={() => setPage((p) => p + 1)}>
          Suivant →
        </button>
      </div>
    </div>
  );
}
