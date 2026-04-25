import { apiGet, apiPatch, apiPost } from '../services/api';
import type { NormalizedGame } from '../types/game';

export type IgdbPlatform = {
  id: number;
  name: string;
};

export type IgdbCover = {
  id: number;
  url: string;
};

export type IgdbGameLocalization = {
  id: number;
  name: string;
  region?: { id: number; name: string };
};

export type IgdbGenre = {
  id: number;
  name: string;
};

export type IgdbCollection = {
  id: number;
  name: string;
};

export type IgdbFranchise = {
  id: number;
  name: string;
};

export type IgdbInvolvedCompany = {
  publisher: boolean;
  company: { name: string };
};

export type IgdbScreenshot = {
  id: number;
  url: string;
};

export type IgdbVideo = {
  id: number;
  video_id: string;
  name?: string;
};

export type IgdbGame = NormalizedGame;

export type IgdbAlternativeName = {
  name: string;
  language?: string;
};

export type FranchiseResult = {
  id: number;
  name: string;
  type: 'franchise' | 'collection';
};

export function getCoverUrl(cover?: IgdbCover): string | null {
  if (!cover?.url) return null;
  if (cover.url.startsWith('//')) {
    return `https:${cover.url}`.replace('t_thumb', 't_cover_big');
  }
  return cover.url;
}

export function formatReleaseDate(ts?: number): string | null {
  if (!ts) return null;
  const date = new Date(ts * 1000);
  return date.toLocaleDateString();
}

export async function fetchIgdbGames(): Promise<IgdbGame[]> {
  return apiGet('/api/igdb/games/');
}

/** Filtres optionnels alignés sur `/api/games/` — IDs IGDB pour genre / platform. */
export type IgdbListFilters = {
  genre?: number[];
  platform?: number[];
  min_age?: number;
  min_players?: number;
  max_players?: number;
};

function appendIgdbListFilters(
  params: URLSearchParams,
  filters?: IgdbListFilters
): void {
  if (!filters) return;
  if (filters.genre?.length)
    params.set('genre', filters.genre.map(String).join(','));
  if (filters.platform?.length)
    params.set('platform', filters.platform.map(String).join(','));
  if (filters.min_age != null) params.set('min_age', String(filters.min_age));
  if (filters.min_players != null)
    params.set('min_players', String(filters.min_players));
  if (filters.max_players != null)
    params.set('max_players', String(filters.max_players));
}

function normalizePositionalGenre(genre?: number | number[]): number[] {
  if (genre == null) return [];
  if (Array.isArray(genre)) return genre;
  return [genre];
}

function mergeGenreFilter(
  filters: IgdbListFilters | undefined,
  positionalGenre: number[]
): IgdbListFilters | undefined {
  const hasPositionalGenre = positionalGenre.length > 0;
  if (!filters) {
    if (!hasPositionalGenre) return undefined;
    return { genre: positionalGenre };
  }

  const merged: IgdbListFilters = { ...filters };
  const hasFilterGenre = (merged.genre?.length ?? 0) > 0;
  if (!hasFilterGenre && hasPositionalGenre) {
    merged.genre = positionalGenre;
  }
  return merged;
}

export async function searchIgdbGames(
  q: string,
  limit = 8,
  suggest = false,
  signal?: AbortSignal,
  filters?: IgdbListFilters
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    suggest: suggest ? '1' : '0',
  });
  appendIgdbListFilters(params, filters);
  return apiGet(`/api/igdb/search/?${params}`, { signal });
}

export async function searchGames(
  q: string,
  options?: {
    limit?: number;
    suggest?: boolean;
    signal?: AbortSignal;
    filters?: IgdbListFilters;
  }
): Promise<IgdbGame[]> {
  return searchIgdbGames(
    q,
    options?.limit ?? 20,
    options?.suggest ?? false,
    options?.signal,
    options?.filters
  );
}

export async function fetchTrendingGames(
  sort: string,
  limit = 20,
  genre?: number | number[],
  offset = 0,
  signal?: AbortSignal,
  enrich = true,
  filters?: IgdbListFilters
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    sort,
    limit: String(limit),
    offset: String(offset),
  });
  const fromPositional = normalizePositionalGenre(genre);
  const merged = mergeGenreFilter(filters, fromPositional);
  appendIgdbListFilters(params, merged);
  if (!enrich) params.set('enrich', '0');
  const data = (await apiGet(`/api/igdb/trending/?${params}`, { signal })) as {
    results: IgdbGame[];
    total_count: number;
  };
  return data.results;
}

export async function fetchTrendingGamesWithCount(
  sort: string,
  limit = 25,
  genre?: number | number[],
  offset = 0,
  signal?: AbortSignal,
  filters?: IgdbListFilters
): Promise<{ games: IgdbGame[]; totalCount: number }> {
  const params = new URLSearchParams({
    sort,
    limit: String(limit),
    offset: String(offset),
  });
  const fromPositional = normalizePositionalGenre(genre);
  const merged = mergeGenreFilter(filters, fromPositional);
  appendIgdbListFilters(params, merged);
  params.set('enrich', '0');
  const data = (await apiGet(`/api/igdb/trending/?${params}`, { signal })) as {
    results: IgdbGame[];
    total_count: number;
  };
  return { games: data.results, totalCount: data.total_count };
}

export async function fetchIgdbGameById(igdbId: number): Promise<IgdbGame> {
  return apiGet(`/api/games/igdb/${igdbId}/`);
}

export async function fetchFranchiseGames(
  franchiseId: number,
  limit = 50,
  offset = 0
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet(`/api/igdb/franchises/${franchiseId}/games/?${params}`);
}

export async function fetchCollectionGames(
  collectionId: number,
  limit = 50,
  offset = 0
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet(`/api/igdb/collections/${collectionId}/games/?${params}`);
}

export async function searchFranchisesAndCollections(
  q: string
): Promise<FranchiseResult[]> {
  return apiGet(`/api/igdb/franchises/?q=${encodeURIComponent(q)}`);
}

export async function searchGamesPage(
  q: string,
  limit = 24,
  offset = 0,
  filters?: IgdbListFilters
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    offset: String(offset),
  });
  appendIgdbListFilters(params, filters);
  return apiGet(`/api/igdb/search-page/?${params}`);
}

export async function translateDescription(text: string): Promise<string> {
  const data = (await apiPost('/api/igdb/translate/', { text })) as {
    translated: string;
  };
  return data.translated;
}

export async function resolveIgdbGame(
  igdbId: number,
  name?: string,
  coverUrl?: string | null,
  releaseDate?: string | null
): Promise<{
  game_id: number;
  normalized_game: NormalizedGame;
  created: boolean;
}> {
  return apiPost('/api/games/resolve-from-igdb/', {
    igdb_id: igdbId,
    name,
    cover_url: coverUrl,
    release_date: releaseDate,
  });
}

export async function resolveGameIdIfNeeded(game: NormalizedGame): Promise<{
  game_id: number;
  normalized_game: NormalizedGame;
}> {
  if (game.django_id) {
    return { game_id: game.django_id, normalized_game: game };
  }
  if (!game.igdb_id) {
    throw new Error(
      '[resolveGameIdIfNeeded] Game has neither django_id nor igdb_id.'
    );
  }
  return resolveIgdbGame(
    game.igdb_id,
    game.name,
    game.cover_url ?? null,
    game.release_date ?? null
  );
}

export async function addGameToLibrary(djangoGameId: number): Promise<void> {
  await apiPatch(`/api/me/games/${djangoGameId}/`, {
    status: 'EN_COURS',
  });
}

export async function fetchGames(_options?: {
  limit?: number;
  offset?: number;
  platforms?: number;
  sort?: string;
}): Promise<IgdbGame[]> {
  return fetchIgdbGames();
}
