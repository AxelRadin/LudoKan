import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost } from '../services/api';
import { fetchUserGames, addUserGame } from '../api/userGames';

vi.mock('../services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}));

describe('userGames API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchUserGames extrait correctement le tableau "results" de la pagination', async () => {
    const mockResponse = {
      count: 1,
      next: null,
      previous: null,
      results: [{ id: 1, status: 'EN_COURS', game: { id: 101 } }],
    };

    vi.mocked(apiGet).mockResolvedValueOnce(mockResponse);

    const data = await fetchUserGames();

    expect(apiGet).toHaveBeenCalledWith('/api/me/games/');
    expect(data).toEqual(mockResponse.results);
  });

  it('fetchUserGames suit les liens next pour agréger toutes les pages', async () => {
    const page1 = {
      count: 3,
      next: 'http://localhost:8000/api/me/games/?page=2',
      previous: null,
      results: [{ id: 1, status: 'EN_COURS', game: { id: 101 } }],
    };
    const page2 = {
      count: 3,
      next: null,
      previous: 'http://localhost:8000/api/me/games/',
      results: [
        { id: 2, status: 'TERMINE', game: { id: 102 } },
        { id: 3, status: 'ENVIE_DE_JOUER', game: { id: 103 } },
      ],
    };
    vi.mocked(apiGet).mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

    const data = await fetchUserGames();

    expect(apiGet).toHaveBeenNthCalledWith(1, '/api/me/games/');
    expect(apiGet).toHaveBeenNthCalledWith(2, '/api/me/games/?page=2');
    expect(data).toHaveLength(3);
  });

  it("fetchUserGames retourne la donnée directement si ce n'est pas paginé", async () => {
    const mockArray = [{ id: 2, status: 'TERMINE', game: { id: 102 } }];
    vi.mocked(apiGet).mockResolvedValueOnce(mockArray);

    const data = await fetchUserGames();
    expect(data).toEqual(mockArray);
  });

  it('addUserGame envoie les bonnes données via POST', async () => {
    const mockCreatedGame = { id: 3, status: 'TERMINE' };
    vi.mocked(apiPost).mockResolvedValueOnce(mockCreatedGame);

    const result = await addUserGame(999, 'TERMINE', 50);

    expect(apiPost).toHaveBeenCalledWith('/api/me/games/', {
      game_id: 999,
      status: 'TERMINE',
      hours_played: 50,
    });
    expect(result).toEqual(mockCreatedGame);
  });
});
