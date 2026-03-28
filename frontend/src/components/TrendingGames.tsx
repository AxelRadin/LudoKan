import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Card, IconButton, Skeleton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GameCard from './GameCard';

export interface Game {
  id: number;
  title: string;
  image: string | undefined;
  coverUrl?: string | null;
  releaseDate?: string | null;
}

export interface TrendingGamesProps {
  games: Game[];
  loading?: boolean;
  title?: string;
  /** Si défini, le titre devient un lien vers cette URL (liste complète de la catégorie). */
  to?: string;
  /** State optionnel passé au navigateur (ex. nom du genre pour la page catégorie). */
  linkState?: object;
}

export const TrendingGames: React.FC<TrendingGamesProps> = ({
  games,
  loading = false,
  title = 'Jeux tendances ➜',
  to,
  linkState,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  const pauseAutoScroll = () => {
    isPausedRef.current = true;
  };

  const resumeAutoScroll = () => {
    isPausedRef.current = false;
  };

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

  const arrowButtonSx = (side: 'left' | 'right') => ({
    position: 'absolute',
    [side]: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 3,
    width: 42,
    height: 42,
    bgcolor: 'common.white',
    color: 'text.primary',
    border: '1px solid',
    borderColor: 'grey.200',
    boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
    transition: 'all 0.2s ease',
    '&:hover': {
      bgcolor: 'common.white',
      boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      transform: 'translateY(-50%) scale(1.05)',
      color: 'text.secondar',
    },
    '&:active': {
      transform: 'translateY(-50%) scale(0.98)',
    },
  });

  const titleText = title.endsWith('➜') ? title : `${title} ➜`;

  return (
    <Box px={4} py={4} position="relative">
      {to ? (
        <Typography
          component={Link}
          to={to}
          state={linkState}
          variant="h6"
          fontWeight="bold"
          mb={2}
          sx={{
            display: 'inline-block',
            color: 'inherit',
            textDecoration: 'none',
            cursor: 'pointer',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {titleText}
        </Typography>
      ) : (
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {titleText}
        </Typography>
      )}

      <Box display="flex" alignItems="center" position="relative">
        {canScrollLeft && (
          <IconButton
            aria-label="Voir les jeux précédents"
            onClick={handleScrollLeft}
            sx={arrowButtonSx('left')}
          >
            <ChevronLeftIcon sx={{ fontSize: 24 }} />
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
            px: 1,
          }}
        >
          {loading ? (
            Array.from({ length: 6 }, (_, idx) => (
              <Box key={`skeleton-${idx}`} width={160}>
                <Skeleton variant="rectangular" width={160} height={220} />
                <Skeleton width="80%" />
              </Box>
            ))
          ) : games.length === 0 ? (
            <Card sx={{ p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Aucun jeu à afficher
              </Typography>
            </Card>
          ) : (
            games.map(game => (
              <GameCard
                key={game.id}
                id={game.id}
                title={game.title}
                image={game.image ?? ''}
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
            sx={arrowButtonSx('right')}
          >
            <ChevronRightIcon sx={{ fontSize: 24 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default TrendingGames;
