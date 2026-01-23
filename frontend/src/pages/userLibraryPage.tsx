import { useUserGames } from "../hooks/useUserGames";

export default function UserLibraryPage() {
  const { games, loading, error, removeGame, updateGame } = useUserGames();

  if (loading) return <p>Chargement de ta bibliothèque…</p>;
  if (error) return <p>Erreur : {error}</p>;

  if (!games.length) {
    return <p>Tu n'as encore aucun jeu dans ta bibliothèque.</p>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Ma bibliothèque de jeux</h1>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {games.map((g) => (
          <li
            key={g.id}
            style={{
              marginBottom: 12,
              padding: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div>
                <strong>IGDB ID :</strong> {g.igdb_game_id}
              </div>
              <div>
                <strong>Statut :</strong> {g.status}
              </div>
              {g.hours_played != null && (
                <div>
                  <strong>Heures jouées :</strong> {g.hours_played}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => updateGame(g.id, { status: "finished" })}
              >
                Marquer comme terminé
              </button>
              <button onClick={() => removeGame(g.id)}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
