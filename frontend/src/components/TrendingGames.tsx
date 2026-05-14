import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Card, IconButton, Skeleton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import GameCard from './GameCard';
import type { NormalizedGame } from '../types/game';

export interface TrendingGamesProps {
  games: NormalizedGame[];
  loading?: boolean;
}

// Hook pour obtenir les couleurs dynamiques basées sur le thème
function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(
    () => ({
      arrowBg: isDark ? 'rgba(42,32,32,0.95)' : 'common.white',
      arrowBgHover: isDark ? 'rgba(50,30,30,1)' : 'common.white',
      arrowColor: isDark ? '#f5e6e6' : 'text.primary',
      arrowColorHover: isDark ? '#FF3D3D' : 'text.secondary',
      arrowBorder: isDark ? 'rgba(74,48,48,0.6)' : 'grey.200',
      arrowShadow: isDark
        ? '0 4px 14px rgba(0,0,0,0.4)'
        : '0 4px 14px rgba(0,0,0,0.12)',
      arrowShadowHover: isDark
        ? '0 6px 18px rgba(255,61,61,0.3)'
        : '0 6px 18px rgba(0,0,0,0.18)',
      cardBg: isDark ? 'rgba(42,32,32,0.78)' : '#fff',
      cardText: isDark ? '#9e7070' : 'text.secondary',
      isDark,
    }),
    [isDark]
  );
}

export const TrendingGames: React.FC<TrendingGamesProps> = ({
  games,
  loading = false,
}) => {
  const { t } = useTranslation();
  const C = useThemeColors();
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
    bgcolor: C.arrowBg,
    backdropFilter: 'blur(12px)',
    color: C.arrowColor,
    border: '1px solid',
    borderColor: C.arrowBorder,
    boxShadow: C.arrowShadow,
    transition: 'all 0.2s ease',
    '&:hover': {
      bgcolor: C.arrowBgHover,
      boxShadow: C.arrowShadowHover,
      transform: 'translateY(-50%) scale(1.05)',
      color: C.arrowColorHover,
      borderColor: C.isDark ? 'rgba(255,61,61,0.4)' : C.arrowBorder,
    },
    '&:active': { transform: 'translateY(-50%) scale(0.98)' },
  });

  let carouselContent: React.ReactNode;
  if (loading) {
    carouselContent = Array.from({ length: 6 }, (_, idx) => (
      <Box key={`skeleton-${idx}`} width={160}>
        <Skeleton
          variant="rectangular"
          width={160}
          height={220}
          sx={{
            bgcolor: C.isDark ? 'rgba(42,32,32,0.6)' : 'rgba(0,0,0,0.11)',
          }}
        />
        <Skeleton
          width="80%"
          sx={{
            bgcolor: C.isDark ? 'rgba(42,32,32,0.6)' : 'rgba(0,0,0,0.11)',
          }}
        />
      </Box>
    ));
  } else if (games.length === 0) {
    carouselContent = (
      <Card
        sx={{
          p: 2,
          bgcolor: C.cardBg,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${C.arrowBorder}`,
        }}
      >
        <Typography variant="body2" sx={{ color: C.cardText }}>
          {t('trendingGames.empty')}
        </Typography>
      </Card>
    );
  } else {
    carouselContent = games.map(game => (
      <GameCard key={game.igdb_id} game={game} />
    ));
  }

  return (
    <Box position="relative">
      <Box display="flex" alignItems="center" position="relative">
        {canScrollLeft && (
          <IconButton
            aria-label={t('trendingGames.prevAriaLabel')}
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
          {carouselContent}
        </Box>

        {canScrollRight && (
          <IconButton
            aria-label={t('trendingGames.nextAriaLabel')}
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
