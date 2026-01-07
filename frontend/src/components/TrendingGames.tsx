import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Card, IconButton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { apiGet } from '../services/api';
import GameCard from './GameCard';

export interface Game {
  id: number;
  title: string;
  image: string;
}

export interface TrendingGamesProps {
  ordering?: string;
  title?: string;
  genre?: string;
}

export const TrendingGames: React.FC<TrendingGamesProps> = ({
  ordering = '',
  title = 'Jeux tendances ➜',
  genre,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let url = ordering ? `/api/games/?ordering=${ordering}` : '/api/games/';
    if (genre) {
      url +=
        (url.includes('?') ? '&' : '?') + `genres=${encodeURIComponent(genre)}`;
    }
    apiGet(url)
      .then(data => {
        const mappedGames = (data.results || []).map((game: any) => {
          let image = game.cover_url || game.image;
          if (image && image.includes('t_thumb')) {
            image = image.replace('t_thumb', 't_cover_big');
          }
          return {
            id: game.id,
            title: game.name,
            image,
          };
        });
        console.log('Fetched games for TrendingGames:', mappedGames);
        setGames(mappedGames);
      })
      .catch(() => setGames([]));
  }, [ordering, genre]);

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

  const emptyCards = Array.from({ length: 20 });

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
          sx={{
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
            flex: 1,
          }}
        >
          {games.length === 0
            ? emptyCards.map((_, idx) => (
                <Card key={idx}>
                  <Typography variant="body2" color="textSecondary">
                    Aucun jeu à afficher
                  </Typography>
                </Card>
              ))
            : games.map(game => (
                <GameCard
                  key={game.id}
                  id={game.id}
                  title={game.title}
                  image={game.image}
                />
              ))}
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
