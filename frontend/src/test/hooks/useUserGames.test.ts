import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchUserGames,
  addUserGame,
  updateUserGame,
  deleteUserGame,
} from '../../api/userGames';
import { useUserGames } from '../../hooks/useUserGames';

vi.mock('../../api/userGames', () => ({
  fetchUserGames: vi.fn(),
  addUserGame: vi.fn(),
  updateUserGame: vi.fn(),
  deleteUserGame: vi.fn(),
}));

describe('useUserGames', () => {
  const mockGames = [
    { id: 1, status: 'TERMINE', game: { id: 101, name: 'Zelda' } },
    { id: 2, status: 'EN_COURS', game: { id: 102, name: 'Mario' } },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchUserGames).mockResolvedValue([...mockGames] as any);
  });

  // --- Tests de chargement initial ---
  it("charge les jeux de l'utilisateur au montage", async () => {
    const { result } = renderHook(() => useUserGames());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.games).toHaveLength(2);
    expect(result.current.games[0].id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("gère l'erreur lors du chargement des jeux", async () => {
    vi.mocked(fetchUserGames).mockRejectedValueOnce(new Error('Erreur API'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useUserGames());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erreur API');
    expect(result.current.games).toEqual([]);

    consoleSpy.mockRestore();
  });

  it("utilise le message d'erreur par défaut si l'erreur n'a pas de message (Ligne 24)", async () => {
    vi.mocked(fetchUserGames).mockRejectedValueOnce({});
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useUserGames());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Erreur inconnue');

    consoleSpy.mockRestore();
  });

  // --- Tests des mutations ---
  it('ajoute un nouveau jeu à la liste', async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newGame = { id: 3, status: 'EN_COURS', game: { id: 103 } };
    vi.mocked(addUserGame).mockResolvedValueOnce(newGame as any);

    await act(async () => {
      await result.current.addGame(103, 'EN_COURS', 10);
    });

    expect(addUserGame).toHaveBeenCalledWith(103, 'EN_COURS', 10);
    expect(result.current.games).toHaveLength(3);
    expect(result.current.games[0].id).toBe(3);
  });

  it('met à jour un jeu existant', async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const updatedGame = {
      id: 1,
      status: 'ENVIE_DE_JOUER',
      game: { id: 101, name: 'Zelda' },
    };
    vi.mocked(updateUserGame).mockResolvedValueOnce(updatedGame as any);

    await act(async () => {
      await result.current.updateGame(1, { status: 'ENVIE_DE_JOUER' });
    });

    expect(updateUserGame).toHaveBeenCalledWith(101, {
      status: 'ENVIE_DE_JOUER',
    });
    expect(result.current.games[0].status).toBe('ENVIE_DE_JOUER');
    expect(result.current.games[1].id).toBe(2);
  });

  it("updateGame utilise l'ID fourni si le jeu n'est pas trouvé dans le state (Lignes 43-46)", async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(updateUserGame).mockResolvedValueOnce({
      id: 999,
      status: 'TERMINE',
    } as any);

    await act(async () => {
      await result.current.updateGame(999, { status: 'TERMINE' });
    });

    expect(updateUserGame).toHaveBeenCalledWith(999, { status: 'TERMINE' });
  });

  it('supprime un jeu de la liste', async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(deleteUserGame).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.removeGame(1);
    });

    expect(deleteUserGame).toHaveBeenCalledWith(101);
    expect(result.current.games).toHaveLength(1);
    expect(result.current.games[0].id).toBe(2);
  });

  it("removeGame utilise l'ID fourni si le jeu n'est pas trouvé dans le state (Lignes 48-50)", async () => {
    const { result } = renderHook(() => useUserGames());
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.mocked(deleteUserGame).mockResolvedValueOnce(undefined);

    await act(async () => {
      await result.current.removeGame(999);
    });

    expect(deleteUserGame).toHaveBeenCalledWith(999);
    expect(result.current.games).toHaveLength(2);
  });
});
