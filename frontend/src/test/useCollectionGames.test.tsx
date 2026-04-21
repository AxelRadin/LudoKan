import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCollectionGames } from '../api/igdb';
import { useCollectionGames } from '../hooks/useCollectionGames';

vi.mock('../api/igdb', () => ({ fetchCollectionGames: vi.fn() }));

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
});
