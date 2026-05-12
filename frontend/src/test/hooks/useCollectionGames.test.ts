import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCollectionGames } from '../../api/igdb';
import { useCollectionGames } from '../../hooks/useCollectionGames';

vi.mock('../../api/igdb', () => ({ fetchCollectionGames: vi.fn() }));

describe('useCollectionGames', () => {
  beforeEach(() => vi.clearAllMocks());

  it('récupère les jeux avec succès', async () => {
    const mockGames = [{ id: 1, name: 'Zelda' }];
    vi.mocked(fetchCollectionGames).mockResolvedValue(mockGames as any);

    const { result } = renderHook(() => useCollectionGames(10, 2, 50));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.games).toEqual(mockGames);
    expect(fetchCollectionGames).toHaveBeenCalledWith(10, 50, 50);
  });

  it('ne fait rien si collectionId est invalide (falsy)', () => {
    const { result } = renderHook(() => useCollectionGames(0, 1));

    expect(result.current.loading).toBe(false);
    expect(result.current.games).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(fetchCollectionGames).not.toHaveBeenCalled();
  });

  it('gère les erreurs API et extrait le message', async () => {
    vi.mocked(fetchCollectionGames).mockRejectedValueOnce(
      new Error('Erreur réseau interne')
    );

    const { result } = renderHook(() => useCollectionGames(10, 1));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Erreur réseau interne');
    expect(result.current.games).toEqual([]);
  });

  it("utilise le message d'erreur par défaut (fallback) si aucun message n'est fourni", async () => {
    vi.mocked(fetchCollectionGames).mockRejectedValueOnce({});

    const { result } = renderHook(() => useCollectionGames(10, 1));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Erreur');
  });
});
