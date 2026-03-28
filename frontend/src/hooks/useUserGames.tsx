import { useEffect, useState } from 'react';
import {
  addUserGame,
  deleteUserGame,
  fetchUserGames,
  updateUserGame,
  type UserGame,
  type UserGameStatus,
} from '../api/userGames';

export function useUserGames() {
  const [games, setGames] = useState<UserGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserGames()
      .then(data => {
        setGames(data);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching user games', err);
        setError(err.message ?? 'Erreur inconnue');
      })
      .finally(() => setLoading(false));
  }, []);

  const addGame = async (
    gameId: number,
    status: UserGameStatus = 'EN_COURS',
    hoursPlayed?: number
  ) => {
    const created = await addUserGame(gameId, status, hoursPlayed);
    setGames(prev => [created, ...prev]);
  };

  const updateGame = async (
    userGameId: number,
    data: Partial<Pick<UserGame, 'status' | 'hours_played'>>
  ) => {
    const ug = games.find(g => g.id === userGameId);
    const gameId = ug?.game?.id ?? userGameId;
    const updated = await updateUserGame(gameId, data);
    setGames(prev => prev.map(g => (g.id === userGameId ? updated : g)));
  };

  const removeGame = async (userGameId: number) => {
    const ug = games.find(g => g.id === userGameId);
    const gameId = ug?.game?.id ?? userGameId;
    await deleteUserGame(gameId);
    setGames(prev => prev.filter(g => g.id !== userGameId));
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
