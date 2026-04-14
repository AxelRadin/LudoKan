import Fuse, { type IFuseOptions } from 'fuse.js';
import { useMemo } from 'react';
import type { NormalizedGame } from '../types/game';

const FUSE_OPTIONS: IFuseOptions<NormalizedGame> = {
  keys: [{ name: 'name', weight: 1.0 }],
  threshold: 0.4,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
  shouldSort: true,
};

/** Indices of matched character ranges, e.g. [[0,2],[5,6]] */
export type MatchIndices = ReadonlyArray<readonly [number, number]>;

export type FuzzyResult<T> = {
  item: T;
  /** Character ranges in `item.name` that matched the query. Empty when no fuzzy was run. */
  nameIndices: MatchIndices;
};

/**
 * Re-ranks a list of games by fuzzy relevance to `query` and returns match
 * indices so callers can highlight matched characters.
 * Returns all items with empty indices when query is empty or too short.
 */
export function useFuzzyGames<T extends NormalizedGame>(
  games: T[],
  query: string
): FuzzyResult<T>[] {
  return useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || games.length === 0) {
      return games.map(item => ({ item, nameIndices: [] }));
    }
    const fuse = new Fuse(games, FUSE_OPTIONS as IFuseOptions<T>);
    return fuse.search(trimmed).map(result => ({
      item: result.item,
      nameIndices:
        (result.matches?.find(m => m.key === 'name')
          ?.indices as MatchIndices) ?? [],
    }));
  }, [games, query]);
}
