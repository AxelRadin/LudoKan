import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Card, CardMedia, IconButton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';
import { apiGet } from '../services/api';

export interface Game {
  title: string;
  image: string;
}

export const TrendingGames: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    apiGet('/api/games/')
      .then((data) => {
        console.log('Réponse backend /api/games/ :', data);
        const mappedGames = (data.results || []).map((game: any) => {
          let image = game.cover_url || game.image;
          if (image && image.includes('t_thumb')) {
            image = image.replace('t_thumb', 't_cover_big'); // ou 't_720p'
          }
          return {
            title: game.name,
            image,
          };
        });
        setGames(mappedGames);
      })
      .catch(() => setGames([]));
  }, []);

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
        Jeux tendances ➜
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
              <Card
                key={idx}
                sx={{
                  minWidth: 150,
                  height: 200,
                  borderRadius: 2,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'grey.400',
                  bgcolor: 'grey.100',
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  Aucun jeu à afficher
                </Typography>
              </Card>
            ))
            : games.map(game => (
              <Card
                key={game.title}
                sx={{ minWidth: 150, borderRadius: 2, flexShrink: 0 }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={game.image}
                  alt={game.title}
                  sx={{ objectFit: 'cover' }}
                />
              </Card>
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