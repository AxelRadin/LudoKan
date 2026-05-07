import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchTrendingGamesWithCount } from '../api/igdb';
import GamesGrid from '../components/GamesGrid';
import PageLayout from '../components/PageLayout';
import type { NormalizedGame } from '../types/game';

// 24 au lieu de 25 -> divisible par 2, 3, 4, 6
const PAGE_SIZE = 24;

export default function TrendingCategoryPage() {
  const { t } = useTranslation();
  const { sort, genreId } = useParams<{ sort?: string; genreId?: string }>();
  const location = useLocation();
  const state = location.state as { genreName?: string } | null;

  const [games, setGames] = useState<NormalizedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const maxDiscoveredPage = useRef(1);
  const [totalPages, setTotalPages] = useState(1);

  const isGenre = genreId != null;

  const SORT_TITLES: Record<string, string> = {
    rating: t('trendingCategory.rating'),
    popularity: t('trendingCategory.popularity'),
    recent: t('trendingCategory.recent'),
    most_rated: t('trendingCategory.mostRated'),
  };

  const title = isGenre
    ? (state?.genreName ?? `Genre #${genreId}`)
    : ((sort && SORT_TITLES[sort]) ?? t('trendingCategory.default'));

  useEffect(() => {
    setPage(1);
    setTotalPages(1);
    maxDiscoveredPage.current = 1;
  }, [sort, genreId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const sortKey = isGenre ? 'popularity' : (sort ?? 'popularity');
    const genreArg = isGenre ? Number(genreId) : undefined;

    const fetchCurrent = fetchTrendingGamesWithCount(
      sortKey,
      PAGE_SIZE,
      genreArg,
      offset,
      controller.signal
    );
    const fetchNext = fetchTrendingGamesWithCount(
      sortKey,
      PAGE_SIZE,
      genreArg,
      offset + PAGE_SIZE,
      controller.signal
    );

    Promise.all([fetchCurrent, fetchNext])
      .then(([current, next]) => {
        if (controller.signal.aborted) return;

        setGames(current.games);

        if (next.games.length > 0) {
          maxDiscoveredPage.current = Math.max(
            maxDiscoveredPage.current,
            page + 1
          );
        } else {
          maxDiscoveredPage.current = Math.max(maxDiscoveredPage.current, page);
        }

        setTotalPages(maxDiscoveredPage.current);
      })
      .catch(() => {
        if (!controller.signal.aborted) setGames([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [sort, genreId, isGenre, page]);

  return (
    <PageLayout title={title}>
      <GamesGrid
        games={games}
        loading={loading}
        emptyMessage={t('trendingCategory.empty')}
      />
      {!loading && totalPages > 1 && (
        <Box mt={5} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => {
              setPage(value);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            color="primary"
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
      )}
    </PageLayout>
  );
}
