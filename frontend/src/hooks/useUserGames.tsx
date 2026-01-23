import { useEffect, useState } from "react";
import {
  addUserGame,
  deleteUserGame,
  fetchUserGames,
  updateUserGame,
  type UserGame,
  type UserGameStatus,
} from "../api/userGamesClient";

export function useUserGames() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserGames()
      .then((data) => {
        setGames(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Error fetching user games", err);
        setError(err.message ?? "Erreur inconnue");
      })
      .finally(() => setLoading(false));
  }, []);

  const addGame = async (
    igdbGameId: number,
    status: UserGameStatus = "playing",
    hoursPlayed?: number
  ) => {
    const created = await addUserGame(igdbGameId, status, hoursPlayed);
    setGames((prev) => [created, ...prev]);
  };

  const updateGame = async (
    id: number,
    data: Partial<Pick<UserGame, "status" | "hours_played">>
  ) => {
    const updated = await updateUserGame(id, data);
    setGames((prev) => prev.map((g) => (g.id === id ? updated : g)));
  };

  const removeGame = async (id: number) => {
    await deleteUserGame(id);
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  return {
    games,
    loading,
    error,
    addGame,
    updateGame,
    removeGame,
  };
}