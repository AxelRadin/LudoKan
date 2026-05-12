import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiGet, apiPost, apiPatch } from '../../services/api';
import * as igdb from '../../api/igdb';

// --- MOCKS ---
vi.mock('../../services/api', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

describe('IGDB API calls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCoverUrl', () => {
    it('retourne null si la cover est absente ou vide', () => {
      expect(igdb.getCoverUrl(undefined)).toBeNull();
      expect(igdb.getCoverUrl({ id: 1, url: '' })).toBeNull();
    });

    it('formate correctement les urls de miniatures IGDB', () => {
      expect(
        igdb.getCoverUrl({
          id: 1,
          url: '//images.igdb.com/igdb/image/upload/t_thumb/co123.jpg',
        })
      ).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big/co123.jpg');
    });

    it('retourne une url standard telle quelle', () => {
      expect(
        igdb.getCoverUrl({ id: 1, url: 'https://custom-url.com/cover.jpg' })
      ).toBe('https://custom-url.com/cover.jpg');
    });
  });

  describe('formatReleaseDate', () => {
    it("retourne null si aucun timestamp n'est fourni", () => {
      expect(igdb.formatReleaseDate()).toBeNull();
    });

    it('formate correctement un timestamp UNIX', () => {
      const ts = 1609459200; // 1er Janvier 2021
      const expected = new Date(ts * 1000).toLocaleDateString();
      expect(igdb.formatReleaseDate(ts)).toBe(expected);
    });
  });

  describe('Appels API standards', () => {
    it('fetchIgdbGames appelle la bonne route', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([{ id: 1 }]);
      const res = await igdb.fetchIgdbGames();

      expect(apiGet).toHaveBeenCalledWith('/api/igdb/games/');
      expect(res).toEqual([{ id: 1 }]);
    });

    it('searchIgdbGames construit les bons paramètres', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([]);
      await igdb.searchIgdbGames('Zelda', 5, true);

      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/search/?q=Zelda&limit=5&suggest=1',
        { signal: undefined }
      );
    });

    it('searchGames mappe correctement les options (y compris les valeurs par défaut)', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([]);

      await igdb.searchGames('Mario', { limit: 10 });
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/search/?q=Mario&limit=10&suggest=0',
        { signal: undefined }
      );

      await igdb.searchGames('Metroid');
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/search/?q=Metroid&limit=20&suggest=0',
        { signal: undefined }
      );
    });

    it('fetchTrendingGames gère les paramètres optionnels (défaut vs définis)', async () => {
      vi.mocked(apiGet).mockResolvedValue({ results: [], total_count: 0 });

      await igdb.fetchTrendingGames('popularity', 10, 5, 20, undefined, false);
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/trending/?sort=popularity&limit=10&offset=20&genre=5&enrich=0',
        { signal: undefined }
      );

      await igdb.fetchTrendingGames('hype');
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/trending/?sort=hype&limit=20&offset=0',
        { signal: undefined }
      );
    });

    it('fetchTrendingGamesWithCount retourne la structure attendue', async () => {
      vi.mocked(apiGet).mockResolvedValue({
        results: [{ id: 1 }],
        total_count: 100,
      });

      const res = await igdb.fetchTrendingGamesWithCount('rating');
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/trending/?sort=rating&limit=25&offset=0&enrich=0',
        { signal: undefined }
      );
      expect(res).toEqual({ games: [{ id: 1 }], totalCount: 100 });

      await igdb.fetchTrendingGamesWithCount('rating', 25, 8);
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/trending/?sort=rating&limit=25&offset=0&genre=8&enrich=0',
        { signal: undefined }
      );
    });

    it('fetchIgdbGameById fonctionne correctement', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce({ name: 'Halo' });
      await igdb.fetchIgdbGameById(50);
      expect(apiGet).toHaveBeenCalledWith('/api/games/igdb/50/');
    });

    it('searchFranchisesAndCollections encode correctement la requête', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([]);
      await igdb.searchFranchisesAndCollections('Zelda & Mario');
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/franchises/?q=Zelda%20%26%20Mario'
      );
    });

    it('translateDescription utilise apiPost', async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({ translated: 'Bonjour' });
      const res = await igdb.translateDescription('Hello');

      expect(apiPost).toHaveBeenCalledWith('/api/igdb/translate/', {
        text: 'Hello',
      });
      expect(res).toBe('Bonjour');
    });

    it('fetchFranchiseGames appelle la bonne route', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([]);
      await igdb.fetchFranchiseGames(123);
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/franchises/123/games/?limit=50&offset=0'
      );
    });

    it('fetchCollectionGames appelle la bonne route avec les bons paramètres', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([]);
      await igdb.fetchCollectionGames(456, 15, 30);
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/collections/456/games/?limit=15&offset=30'
      );
    });

    it('searchGamesPage construit les bons paramètres de pagination', async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([]);
      await igdb.searchGamesPage('Metroid', 12, 24);
      expect(apiGet).toHaveBeenCalledWith(
        '/api/igdb/search-page/?q=Metroid&limit=12&offset=24'
      );
    });

    it("fetchGames redirige l'appel vers fetchIgdbGames", async () => {
      vi.mocked(apiGet).mockResolvedValueOnce([{ id: 99 }]);
      const res = await igdb.fetchGames({ limit: 10 });
      expect(apiGet).toHaveBeenCalledWith('/api/igdb/games/');
      expect(res).toEqual([{ id: 99 }]);
    });
  });

  describe('resolveGameIdIfNeeded', () => {
    it("retourne le django_id directement s'il existe", async () => {
      const game: any = { django_id: 42, name: 'Test' };
      const res = await igdb.resolveGameIdIfNeeded(game);

      expect(res).toEqual({ game_id: 42, normalized_game: game });
      expect(apiPost).not.toHaveBeenCalled();
    });

    it("lève une erreur s'il n'y a ni django_id ni igdb_id", async () => {
      const game: any = { name: 'Test' };
      await expect(igdb.resolveGameIdIfNeeded(game)).rejects.toThrow(
        /neither django_id nor igdb_id/
      );
    });

    it('appelle apiPost pour résoudre via igdb_id si django_id est manquant', async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        game_id: 99,
        normalized_game: {},
        created: true,
      });
      const game: any = {
        igdb_id: 10,
        name: 'Zelda',
        cover_url: 'url',
        release_date: '2020',
      };

      const res = await igdb.resolveGameIdIfNeeded(game);

      expect(apiPost).toHaveBeenCalledWith('/api/games/resolve-from-igdb/', {
        igdb_id: 10,
        name: 'Zelda',
        cover_url: 'url',
        release_date: '2020',
      });
      expect(res.game_id).toBe(99);
    });

    it('utilise les fallback null si cover_url et release_date manquent', async () => {
      vi.mocked(apiPost).mockResolvedValueOnce({
        game_id: 100,
        normalized_game: {},
        created: true,
      });
      const game: any = { igdb_id: 20, name: 'Mario' };

      await igdb.resolveGameIdIfNeeded(game);

      expect(apiPost).toHaveBeenCalledWith('/api/games/resolve-from-igdb/', {
        igdb_id: 20,
        name: 'Mario',
        cover_url: null,
        release_date: null,
      });
    });
  });

  describe('addGameToLibrary', () => {
    it('utilise apiPatch avec le statut EN_COURS', async () => {
      vi.mocked(apiPatch).mockResolvedValueOnce({});
      await igdb.addGameToLibrary(123);
      expect(apiPatch).toHaveBeenCalledWith('/api/me/games/123/', {
        status: 'EN_COURS',
      });
    });
  });
});
