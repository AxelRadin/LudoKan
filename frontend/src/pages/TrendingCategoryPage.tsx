import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchTrendingGamesWithCount } from '../api/igdb';
import GamesGrid from '../components/GamesGrid';
import PageLayout from '../components/PageLayout';
import type { NormalizedGame } from '../types/game';

const PAGE_SIZE = 25;

export default function TrendingCategoryPage() {
  const { t } = useTranslation();
  const { sort, genreId } = useParams<{ sort?: string; genreId?: string }>();
  const location = useLocation();
  const state = location.state as { genreName?: string } | null;

  const [games, setGames] = useState<NormalizedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

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
    setHasMore(false);
  }, [sort, genreId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;
    const sortKey = isGenre ? 'popularity' : (sort ?? 'popularity');
    const genreArg = isGenre ? Number(genreId) : undefined;

    fetchTrendingGamesWithCount(
      sortKey,
      PAGE_SIZE,
      genreArg,
      offset,
      controller.signal
    )
      .then(({ games: data }) => {
        if (!controller.signal.aborted) {
          setGames(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setGames([]);
          setHasMore(false);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [sort, genreId, isGenre, page]);

  // count = pages connues + 1 si il y en a peut-être d'autres
  const count = hasMore ? page + 1 : page;

  return (
    <PageLayout title={title}>
      <GamesGrid
        games={games}
        loading={loading}
        emptyMessage={t('trendingCategory.empty')}
      />
      {!loading && (page > 1 || hasMore) && (
        <Box mt={5} display="flex" justifyContent="center">
          <Pagination
            count={count}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            siblingCount={1}
            boundaryCount={1}
          />
        </Box>
      )}
    </PageLayout>
  );
}
