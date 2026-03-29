import { apiGet, apiPost } from '../services/api';
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

export async function searchIgdbGames(
  q: string,
  limit = 8,
  suggest = false,
  signal?: AbortSignal
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    suggest: suggest ? '1' : '0',
  });
  return apiGet(`/api/igdb/search/?${params}`, { signal });
}

export async function searchGames(
  q: string,
  options?: { limit?: number; suggest?: boolean; signal?: AbortSignal }
): Promise<IgdbGame[]> {
  return searchIgdbGames(
    q,
    options?.limit ?? 20,
    options?.suggest ?? false,
    options?.signal
  );
}

export async function fetchTrendingGames(
  sort: string,
  limit = 20,
  genre?: number,
  offset = 0,
  signal?: AbortSignal,
  enrich = true
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    sort,
    limit: String(limit),
    offset: String(offset),
  });
  if (genre != null) params.set('genre', String(genre));
  if (!enrich) params.set('enrich', '0');
  return apiGet(`/api/igdb/trending/?${params}`, { signal });
}

export async function fetchIgdbGameById(igdbId: number): Promise<IgdbGame> {
  return apiGet(`/api/igdb/games/${igdbId}/`);
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
  offset = 0
): Promise<IgdbGame[]> {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    offset: String(offset),
  });
  return apiGet(`/api/igdb/search-page/?${params}`);
}

export async function translateDescription(text: string): Promise<string> {
  const data = (await apiPost('/api/igdb/translate/', { text })) as {
    translated: string;
  };
  return data.translated;
}

// ---------------------------------------------------------------------------
// Django : import jeu IGDB + ajout à la ludothèque (api/games/..., api/me/...)
// ---------------------------------------------------------------------------

export async function importIgdbGameToDjango(
  igdbId: number,
  name: string,
  coverUrl: string | null,
  releaseDate: string | null
): Promise<{ id: number }> {
  return apiPost('/api/games/igdb-import/', {
    igdb_id: igdbId,
    name,
    cover_url: coverUrl,
    release_date: releaseDate,
  });
}

export async function addGameToLibrary(djangoGameId: number): Promise<void> {
  await apiPost('/api/me/games/', {
    game_id: djangoGameId,
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
