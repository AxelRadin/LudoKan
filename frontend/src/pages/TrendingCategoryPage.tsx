import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { fetchTrendingGamesWithCount } from '../api/igdb';
import GamesGrid from '../components/GamesGrid';
import PageLayout from '../components/PageLayout';
import type { NormalizedGame } from '../types/game';

const SORT_TITLES: Record<string, string> = {
  rating: 'Jeux les mieux notés',
  popularity: 'Jeux les plus populaires',
  recent: 'Jeux les plus récents',
  most_rated: 'Jeux les plus notés',
};

const PAGE_SIZE = 25;

export default function TrendingCategoryPage() {
  const { sort, genreId } = useParams<{ sort?: string; genreId?: string }>();
  const location = useLocation();
  const state = location.state as { genreName?: string } | null;

  const [games, setGames] = useState<NormalizedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const isGenre = genreId != null;
  const title = isGenre
    ? (state?.genreName ?? `Genre #${genreId}`)
    : ((sort && SORT_TITLES[sort]) ?? 'Jeux tendances');

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
    setTotalCount(0);
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
      .then(({ games: data, totalCount: count }) => {
        if (!controller.signal.aborted) {
          setGames(data);
          setTotalCount(count);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setGames([]);
        }
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
        emptyMessage="Aucun jeu dans cette catégorie."
      />
      {!loading && totalPages > 1 && (
        <Box mt={5} display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
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
