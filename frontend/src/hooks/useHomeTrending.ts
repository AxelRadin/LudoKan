/**
 * Hook pour charger toutes les sections « tendances » de la homepage.
 * Un seul endroit pour les fetches ; les données sont passées en props à TrendingGames.
 */
import { useCallback, useEffect, useState } from 'react';
import { fetchTrendingGames, getCoverUrl } from '../api/igdb';
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
      fetchTrendingGames(sort, 20, undefined, 0, signal, false)
        .then(data => {
          setSections(prev => ({
            ...prev,
            [sort]: {
              games: data.map(mapIgdbToGame),
              loading: false,
            },
          }));
        })
        .catch(err => {
          if (err?.name !== 'AbortError') {
            setSections(prev => ({
              ...prev,
              [sort]: { games: [], loading: false },
            }));
          }
        });
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
    fetchTrendingGames(
      'popularity',
      20,
      selectedGenre.id,
      0,
      controller.signal,
      false
    )
      .then(data => {
        setGenreSection({
          games: data.map(mapIgdbToGame),
          loading: false,
        });
      })
      .catch(err => {
        if (err?.name !== 'AbortError') {
          setGenreSection({ games: [], loading: false });
        }
      });
    return () => controller.abort();
  }, [selectedGenre]);

  const resolvedGenreSection =
    selectedGenre && (genreSection ?? { games: [], loading: true });

  return { sections, genreSection: resolvedGenreSection };
}
