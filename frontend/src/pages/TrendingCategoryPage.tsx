import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { fetchTrendingGames, getCoverUrl } from '../api/igdb';
import GamesGrid, { type GameForCard } from '../components/GamesGrid';
import PageLayout from '../components/PageLayout';

const SORT_TITLES: Record<string, string> = {
  rating: 'Jeux les mieux notés',
  popularity: 'Jeux les plus populaires',
  recent: 'Jeux les plus récents',
  most_rated: 'Jeux les plus notés',
};

const PAGE_SIZE = 25;

function mapIgdbToGame(game: any): GameForCard {
  const coverUrl = getCoverUrl(game.cover);
  const releaseDate = game.first_release_date
    ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
    : null;
  return {
    id: game.id,
    title: game.display_name ?? game.name,
    image: coverUrl ?? '',
    coverUrl: coverUrl ?? null,
    releaseDate,
  };
}

export default function TrendingCategoryPage() {
  const { sort, genreId } = useParams<{ sort?: string; genreId?: string }>();
  const location = useLocation();
  const state = location.state as { genreName?: string } | null;

  const [games, setGames] = useState<GameForCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const isGenre = genreId != null;
  const title = isGenre
    ? (state?.genreName ?? `Genre #${genreId}`)
    : ((sort && SORT_TITLES[sort]) ?? 'Jeux tendances');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const offset = (page - 1) * PAGE_SIZE;

    const onSettled = () => {
      if (!controller.signal.aborted) setLoading(false);
    };

    if (isGenre) {
      const id = Number(genreId);
      fetchTrendingGames(
        'popularity',
        PAGE_SIZE,
        id,
        offset,
        controller.signal,
        false
      )
        .then(data => {
          if (!controller.signal.aborted) {
            setGames(data.map(mapIgdbToGame));
            setHasMore(data.length === PAGE_SIZE);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setGames([]);
            setHasMore(false);
          }
        })
        .finally(onSettled);
    } else if (sort) {
      fetchTrendingGames(
        sort,
        PAGE_SIZE,
        undefined,
        offset,
        controller.signal,
        false
      )
        .then(data => {
          if (!controller.signal.aborted) {
            setGames(data.map(mapIgdbToGame));
            setHasMore(data.length === PAGE_SIZE);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setGames([]);
            setHasMore(false);
          }
        })
        .finally(onSettled);
    } else {
      setGames([]);
      setHasMore(false);
      setLoading(false);
    }

    return () => controller.abort();
  }, [sort, genreId, isGenre, page]);

  return (
    <PageLayout title={title}>
      <GamesGrid
        games={games}
        loading={loading}
        emptyMessage="Aucun jeu dans cette catégorie."
        igdb
      />
      {!loading && (page > 1 || hasMore) && (
        <Box mt={5} display="flex" justifyContent="center">
          <Pagination
            count={hasMore ? page + 1 : page}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
            siblingCount={1}
          />
        </Box>
      )}
    </PageLayout>
  );
}
