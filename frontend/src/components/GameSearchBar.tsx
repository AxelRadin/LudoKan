import { useEffect, useRef, useState } from "react";
import { getCoverUrl, type IgdbGame } from "../api/apiClient";
import { useIgdbSuggestions } from "../hooks/useIgdbSuggestions";
// import Link from "next/dist/client/link";
import { Link } from "react-router-dom";

//

type Props = {
    onSelect: (game: IgdbGame) => void;
};

function getDisplayName(game: IgdbGame): string {
  return (game as any).display_name ?? game.name;
}


export default function GameSearchBar({ onSelect}: Props) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);

    const { suggestions, loading, error, setSuggestions } = useIgdbSuggestions(query);

    const containerRef = useRef<HTMLDivElement | null>(null);

    // Pour fermer quand qqn clique en dehors
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", onDocClick);
    }, []);

    const showDropdown = open && (loading || error || suggestions.length > 0);
    const bestLicenseId = suggestions.find((g) => g.collections?.length)?.collections?.[0]?.id;



    return (
      
       <div ref={containerRef} style={{ position: "relative", maxWidth: 520 }}>
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un jeu… (ex: Zelda, Mario, Pokemon)"
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ddd",
        }}
      />

      <div style={{ fontSize: 12, marginTop: 6 }}>
  open: {String(open)} | loading: {String(loading)} | err: {String(!!error)} |
  suggestions: {suggestions.length} | showDropdown: {String(showDropdown)}
</div>

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            border: "1px solid #ddd",
            borderRadius: 10,
            background: "white",
            overflow: "auto",
            maxHeight: 360,
            boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
            zIndex: 50,
          }}
        >
          {loading && (
            <div style={{ padding: 10, borderBottom: "1px solid #eee" }}>
              Recherche…
            </div>
          )}

          {error && <div style={{ padding: 10 }}>Erreur : {error}</div>}

          {!loading && !error && suggestions.length === 0 && (
            <div style={{ padding: 10 }}>Aucun résultat</div>
          )}

          {!loading &&
            !error &&
            suggestions.map((g) => {
              const cover = getCoverUrl(g.cover);
              console.log(
      "LOCALIZATIONS:",
      g.name,
      g.game_localizations?.map((l) => l.region?.name)
    );
              //console.log("SUGG ITEM", g.id, g.name);
              return (
                <button
                key={g.id}
                type="button"
                onClick={() => {
                  onSelect(g);
                  setQuery(getDisplayName(g));

                  setOpen(false);
                  setSuggestions([]);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  borderTop: "1px solid #eee",
                }}
              >
                {/* Cover */}
                <div
                  style={{
                    width: 34,
                    height: 46,
                    borderRadius: 6,
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
                    <img
                      src={cover}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    "—"
                  )}
                </div>

                {/* Texte à droite */}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      color: "#111",        // ✅ force la couleur
                      fontSize: 14,         // ✅ force la taille
                      lineHeight: "18px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <div title={g.name}>
                      {getDisplayName(g)}
                    </div>
                    {bestLicenseId ? (
                    <div style={{ padding: 10, borderTop: "1px solid #eee", background: "#fafafa" }}>
                      <Link
                        to={`/license/${bestLicenseId}`}
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        style={{ fontSize: 12, textDecoration: "underline", color: "#2563eb" }}
                      >
                        Voir plus →
                      </Link>
                    </div>
                  ) : null}
                  </div>
                  {g.platforms?.length ? (
                    <div
                      style={{
                        color: "#555",      // ✅ force la couleur
                        fontSize: 12,
                        lineHeight: "16px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {g.platforms.slice(0, 3).map((p) => p.name).join(", ")}
                      {g.platforms.length > 3 ? "…" : ""}
                    </div>
                  ) : null}
                </div>
              </button>

              );
            })}
        </div>
      )}
    </div> 
    );
}

