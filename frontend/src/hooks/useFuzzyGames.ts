import Fuse, { type IFuseOptions } from 'fuse.js';
import { useMemo } from 'react';
import type { NormalizedGame } from '../types/game';

const FUSE_OPTIONS: IFuseOptions<NormalizedGame> = {
  keys: [{ name: 'name', weight: 1.0 }],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
  shouldSort: true,
};

/**
 * Re-ranks a list of games by fuzzy relevance to `query`.
 * Returns the original list unchanged when query is empty or too short.
 */
export function useFuzzyGames<T extends NormalizedGame>(
  games: T[],
  query: string
): T[] {
  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || games.length === 0) return games;
    const fuse = new Fuse(games, FUSE_OPTIONS as IFuseOptions<T>);
    return fuse.search(trimmed).map(result => result.item);
  }, [games, query]);
}
