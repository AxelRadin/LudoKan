import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { fetchTrendingGames, getCoverUrl, type IgdbGame } from '../api/igdb';
import type { Game } from '../components/TrendingGames';

const TRENDING_SORTS = [
  'rating',
  'popularity',
  'recent',
  'most_rated',
] as const;
type SortKey = (typeof TRENDING_SORTS)[number];

export interface TrendingSection {
  games: Game[];
  loading: boolean;
}

function mapIgdbToGame(game: any): Game {
  const coverUrl = getCoverUrl(game.cover);
  const releaseDate = game.first_release_date
    ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
    : null;
  return {
    id: game.id,
    title: game.display_name ?? game.name,
    image: coverUrl ?? undefined,
    coverUrl: coverUrl ?? null,
    releaseDate,
  };
}

function applySortSuccess(
  sort: SortKey,
  data: IgdbGame[]
): (
  prev: Record<SortKey, TrendingSection>
) => Record<SortKey, TrendingSection> {
  return prev => ({
    ...prev,
    [sort]: {
      games: data.map(mapIgdbToGame),
      loading: false,
    },
  });
}

function applySortError(
  sort: SortKey
): (
  prev: Record<SortKey, TrendingSection>
) => Record<SortKey, TrendingSection> {
  return prev => ({
    ...prev,
    [sort]: { games: [], loading: false },
  });
}

async function fetchTrendingSection(
  sort: SortKey,
  signal: AbortSignal,
  setSections: Dispatch<SetStateAction<Record<SortKey, TrendingSection>>>
): Promise<void> {
  try {
    const data = await fetchTrendingGames(
      sort,
      20,
      undefined,
      0,
      signal,
      false
    );
    setSections(applySortSuccess(sort, data));
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e?.name !== 'AbortError') {
      setSections(applySortError(sort));
    }
  }
}

async function loadGenrePopularitySection(
  genreId: number,
  signal: AbortSignal,
  setGenreSection: Dispatch<SetStateAction<TrendingSection | null>>
): Promise<void> {
  try {
    const data = await fetchTrendingGames(
      'popularity',
      20,
      genreId,
      0,
      signal,
      false
    );
    setGenreSection({
      games: data.map(mapIgdbToGame),
      loading: false,
    });
  } catch (err: unknown) {
    const e = err as { name?: string };
    if (e?.name !== 'AbortError') {
      setGenreSection({ games: [], loading: false });
    }
  }
}

export interface UseHomeTrendingOptions {
  selectedGenre?: { id: number; name: string } | null;
}

export function useHomeTrending(options: UseHomeTrendingOptions = {}) {
  const { selectedGenre } = options;

  const [sections, setSections] = useState<Record<SortKey, TrendingSection>>(
    () => {
      const initial: Record<string, TrendingSection> = {};
      TRENDING_SORTS.forEach(sort => {
        initial[sort] = { games: [], loading: true };
      });
      return initial as Record<SortKey, TrendingSection>;
    }
  );

  const [genreSection, setGenreSection] = useState<TrendingSection | null>(
    null
  );

  const loadSections = useCallback(() => {
    const controller = new AbortController();
    const { signal } = controller;

    TRENDING_SORTS.forEach(sort => {
      void fetchTrendingSection(sort, signal, setSections);
    });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const abort = loadSections();
    return abort;
  }, [loadSections]);

  useEffect(() => {
    if (!selectedGenre) {
      setGenreSection(null);
      return;
    }
    setGenreSection({ games: [], loading: true });
    const controller = new AbortController();
    void loadGenrePopularitySection(
      selectedGenre.id,
      controller.signal,
      setGenreSection
    );
    return () => controller.abort();
  }, [selectedGenre]);

  const resolvedGenreSection =
    selectedGenre && (genreSection ?? { games: [], loading: true });

  return { sections, genreSection: resolvedGenreSection };
}
