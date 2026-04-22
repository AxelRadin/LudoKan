import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserGames, addUserGame, deleteUserGame } from '../api/userGames';
import { useUserGames } from '../hooks/useUserGames';

vi.mock('../api/userGames', () => ({
  fetchUserGames: vi.fn(),
  addUserGame: vi.fn(),
  updateUserGame: vi.fn(),
  deleteUserGame: vi.fn(),
}));

describe('useUserGames', () => {
  const mockGames = [
    { id: 1, status: 'TERMINE', game: { id: 101, name: 'Zelda' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUserGames).mockResolvedValue([...mockGames] as any);
  });

  it("charge les jeux de l'utilisateur au montage", async () => {
    const { result } = renderHook(() => useUserGames());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.games).toHaveLength(1);
    expect(result.current.games[0].id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('ajoute un nouveau jeu à la liste', async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newGame = { id: 2, status: 'EN_COURS', game: { id: 102 } };
    vi.mocked(addUserGame).mockResolvedValueOnce(newGame as any);

    await act(async () => {
      await result.current.addGame(102, 'EN_COURS', 10);
    });

    expect(addUserGame).toHaveBeenCalledWith(102, 'EN_COURS', 10);

    expect(result.current.games).toHaveLength(2);
    expect(result.current.games[0].id).toBe(2);
  });

  it('supprime un jeu de la liste', async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(deleteUserGame).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.removeGame(1);
    });

    expect(deleteUserGame).toHaveBeenCalledWith(101);

    expect(result.current.games).toHaveLength(0);
  });
});
