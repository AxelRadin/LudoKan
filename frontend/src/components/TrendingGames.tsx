import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Card, IconButton, Skeleton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { fetchTrendingGames, getCoverUrl } from '../api/apiClient';
import GameCard from './GameCard';

export interface Game {
  id: number;
  title: string;
  image: string;
  coverUrl?: string | null;
  releaseDate?: string | null;
}

export interface TrendingGamesProps {
  igdbSort: string;
  title?: string;
  genre?: number;
}

export const TrendingGames: React.FC<TrendingGamesProps> = ({
  igdbSort,
  title = 'Jeux tendances ➜',
  genre,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [games, setGames] = useState<Game[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchTrendingGames(igdbSort, 20, genre)
      .then(data => {
        const mappedGames = data.map((game: any) => {
          const coverUrl = getCoverUrl(game.cover);
          const image = coverUrl ?? undefined;
          const releaseDate = game.first_release_date
            ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
            : null;
          return {
            id: game.id,
            title: game.display_name ?? game.name,
            image,
            coverUrl: coverUrl ?? null,
            releaseDate,
          };
        });
        setGames(mappedGames);
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [igdbSort, genre]);

  const checkScroll = () => {
    if (scrollRef.current) {
      setCanScrollLeft(scrollRef.current.scrollLeft > 0);
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    const ref = scrollRef.current;
    if (!ref) return;
    ref.addEventListener('scroll', checkScroll);
    checkScroll();
    return () => {
      ref.removeEventListener('scroll', checkScroll);
    };
  }, [games]);

  // Auto-scroll
  useEffect(() => {
    if (games.length === 0) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        if (isPausedRef.current || !scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 170, behavior: 'smooth' });
        }
      }, 3000);
    };

    startAutoScroll();
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, [games]);

  const pauseAutoScroll = () => { isPausedRef.current = true; };
  const resumeAutoScroll = () => { isPausedRef.current = false; };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  return (
    <Box px={4} py={4} position="relative">
      <Typography variant="h6" fontWeight="bold" mb={2}>
        {title ? `${title} ➜` : 'Jeux tendances ➜'}
      </Typography>
      <Box display="flex" alignItems="center" position="relative">
        {canScrollLeft && (
          <IconButton
            aria-label="Voir les jeux précédents"
            onClick={handleScrollLeft}
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'white',
              boxShadow: 1,
              zIndex: 2,
            }}
          >
            <ArrowBackIosIcon />
          </IconButton>
        )}
        <Box
          ref={scrollRef}
          display="flex"
          gap={2}
          overflow="auto"
          onMouseEnter={pauseAutoScroll}
          onMouseLeave={resumeAutoScroll}
          onTouchStart={pauseAutoScroll}
          onTouchEnd={resumeAutoScroll}
          sx={{
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            flex: 1,
          }}
        >
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <Box key={idx} width={160}>
                <Skeleton variant="rectangular" width={160} height={220} />
                <Skeleton width="80%" />
              </Box>
            ))
          ) : games.length === 0 ? (
            <Card>
              <Typography variant="body2" color="textSecondary">
                Aucun jeu à afficher
              </Typography>
            </Card>
          ) : (
            games.map(game => (
              <GameCard
                key={game.id}
                id={game.id}
                title={game.title}
                image={game.image}
                coverUrl={game.coverUrl}
                releaseDate={game.releaseDate}
                igdb
              />
            ))
          )}
        </Box>
        {canScrollRight && (
          <IconButton
            aria-label="Voir plus de jeux"
            onClick={handleScrollRight}
            sx={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'white',
              boxShadow: 1,
              zIndex: 2,
            }}
          >
            <ArrowForwardIosIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default TrendingGames;
