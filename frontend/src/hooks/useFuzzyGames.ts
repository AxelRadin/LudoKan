import Fuse from 'fuse.js';
import type { IFuseOptions, FuseResult } from 'fuse.js';
import { useMemo } from 'react';
import type { NormalizedGame } from '../types/game';

/**
 * Strip diacritics and lowercase for accent-insensitive matching.
 * "Pokémon" → "pokemon", "Ñ" → "n"
 * Preserves 1:1 character positions so match indices are reusable on the
 * original string (each accented char normalises to exactly one base char).
 */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replaceAll(/\p{Mn}/gu, '')
    .toLowerCase();
}

/** Indices of matched character ranges, e.g. [[0,2],[5,6]] */
export type MatchIndices = ReadonlyArray<readonly [number, number]>;

export type FuzzyResult<T> = {
  item: T;
  /** Character ranges in `item.name` that matched the query. Empty when no fuzzy was run. */
  nameIndices: MatchIndices;
};

/** Game augmented with a normalised name used as the Fuse.js search key */
type WithNorm<T extends NormalizedGame> = T & { _norm: string };

/** Tight threshold for full-phrase matching */
const FULL_PHRASE_OPTIONS: IFuseOptions<WithNorm<NormalizedGame>> = {
  keys: [{ name: '_norm', weight: 1 }],
  threshold: 0.6,
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  findAllMatches: true,
  minMatchCharLength: 1,
  shouldSort: true,
};

/** Looser threshold for individual-token matching */
const TOKEN_OPTIONS: IFuseOptions<WithNorm<NormalizedGame>> = {
  ...FULL_PHRASE_OPTIONS,
  threshold: 0.45,
};

function extractIndices(
  result: FuseResult<WithNorm<NormalizedGame>>,
  key: string
): MatchIndices {
  return (
    (result.matches?.find((m: { key?: string }) => m.key === key)
      ?.indices as MatchIndices) ?? []
  );
}

/**
 * Re-ranks a list of games by fuzzy relevance to `query` and returns match
 * indices so callers can highlight matched characters.
 *
 * Strategy:
 *  1. Normalise accents on both game names and query before comparing.
 *  2. Run a full-phrase fuzzy search (threshold 0.6).
 *  3. For multi-word queries, also run per-token searches (threshold 0.45)
 *     and surface any game matched by ALL tokens that wasn't already found.
 *  4. Merge: full-phrase results first, then token-AND matches by best score.
 *
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

    // Augment each game with a normalised name field for Fuse comparison
    const augmented: WithNorm<T>[] = games.map(g => ({
      ...g,
      _norm: normalize(g.name),
    }));

    const normQuery = normalize(trimmed);
    const tokens = normQuery.split(/\s+/).filter(t => t.length >= 2);

    // ── 1. Full-phrase search ─────────────────────────────────────────────
    const fullFuse = new Fuse(
      augmented,
      FULL_PHRASE_OPTIONS as IFuseOptions<WithNorm<T>>
    );
    const fullResults = fullFuse.search(normQuery);

    const seenItems = new Set<T>();
    const merged: FuzzyResult<T>[] = [];

    for (const r of fullResults) {
      if (seenItems.has(r.item)) continue;
      seenItems.add(r.item);
      merged.push({
        item: r.item,
        nameIndices: extractIndices(
          r as FuseResult<WithNorm<NormalizedGame>>,
          '_norm'
        ),
      });
    }

    // ── 2. Per-token search (multi-word queries only) ─────────────────────
    if (tokens.length >= 2) {
      // For each token, collect matching items → Map<item, best score>
      const tokenHits: Map<
        T,
        { count: number; score: number; indices: MatchIndices }
      >[] = tokens.map(token => {
        const fuse = new Fuse(
          augmented,
          TOKEN_OPTIONS as IFuseOptions<WithNorm<T>>
        );
        const hits = new Map<
          T,
          { count: number; score: number; indices: MatchIndices }
        >();
        for (const r of fuse.search(token)) {
          hits.set(r.item, {
            count: 1,
            score: r.score ?? 1,
            indices: extractIndices(
              r as FuseResult<WithNorm<NormalizedGame>>,
              '_norm'
            ),
          });
        }
        return hits;
      });

      // Intersect: keep only games that matched EVERY token
      const [first, ...rest] = tokenHits;
      const candidates: Map<T, { score: number; indices: MatchIndices }> =
        new Map();
      for (const [item, data] of first) {
        if (rest.every(m => m.has(item))) {
          // Average score across tokens (lower = better in Fuse)
          const totalScore =
            data.score +
            rest.reduce((acc, m) => acc + (m.get(item)?.score ?? 1), 0);
          candidates.set(item, {
            score: totalScore / tokens.length,
            indices: data.indices,
          });
        }
      }

      // Append token-AND matches not already in full-phrase results
      const sorted = [...candidates.entries()].sort(
        (a, b) => a[1].score - b[1].score
      );
      for (const [item, { indices }] of sorted) {
        if (!seenItems.has(item)) {
          merged.push({ item, nameIndices: indices });
        }
      }
    }

    return merged;
  }, [games, query]);
}
