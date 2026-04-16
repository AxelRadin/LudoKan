import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Card, IconButton, Skeleton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GameCard from './GameCard';

import type { NormalizedGame } from '../types/game';

export interface TrendingGamesProps {
  games: NormalizedGame[];
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
  title = 'Jeux tendances',
  to,
  linkState,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const positionRef = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      positionRef.current = scrollLeft;
      setCanScrollLeft(scrollLeft > 0);
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

    const SCROLL_SPEED = 0.18;

    const animate = () => {
      if (!isPausedRef.current && scrollRef.current) {
        const { scrollWidth, clientWidth } = scrollRef.current;
        if (positionRef.current + clientWidth >= scrollWidth - 1) {
          positionRef.current = 0;
        } else {
          positionRef.current += SCROLL_SPEED;
        }
        scrollRef.current.scrollLeft = positionRef.current;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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
      const { scrollWidth, clientWidth } = scrollRef.current;
      positionRef.current = Math.min(
        positionRef.current + 200,
        scrollWidth - clientWidth
      );
      scrollRef.current.scrollLeft = positionRef.current;
    }
  };

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      positionRef.current = Math.max(positionRef.current - 200, 0);
      scrollRef.current.scrollLeft = positionRef.current;
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
      color: 'text.secondary',
    },
    '&:active': {
      transform: 'translateY(-50%) scale(0.98)',
    },
  });

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
          {title}
        </Typography>
      ) : (
        <Typography variant="h6" fontWeight="bold" mb={2}>
          {title}
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
            games.map(game => <GameCard key={game.igdb_id} game={game} />)
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
