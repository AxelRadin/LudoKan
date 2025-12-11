import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { Card, CardMedia, IconButton } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React, { useEffect, useRef, useState } from 'react';

export interface Game {
  title: string;
  image: string;
}

interface TrendingGamesProps {
  games?: Game[];
}

const defaultGames: Game[] = [
  { title: 'League of Legends', image: '/games/lol.jpg' },
  { title: 'Rocket League', image: '/games/rocketleague.jpg' },
  { title: 'Genshin Impact', image: '/games/genshin.jpg' },
  { title: 'Assassin’s Creed Shadows', image: '/games/acshadows.jpg' },
  { title: 'Expedition 33', image: '/games/expedition33.jpg' },

  { title: 'League of Legends', image: '/games/lol.jpg' },
  { title: 'Rocket League', image: '/games/rocketleague.jpg' },
  { title: 'Genshin Impact', image: '/games/genshin.jpg' },
  { title: 'Assassin’s Creed Shadows', image: '/games/acshadows.jpg' },
  { title: 'Expedition 33', image: '/games/expedition33.jpg' },

  { title: 'League of Legends', image: '/games/lol.jpg' },
  { title: 'Rocket League', image: '/games/rocketleague.jpg' },
  { title: 'Genshin Impact', image: '/games/genshin.jpg' },
  { title: 'Assassin’s Creed Shadows', image: '/games/acshadows.jpg' },
  { title: 'Expedition 33', image: '/games/expedition33.jpg' },
];

export const TrendingGames: React.FC<TrendingGamesProps> = ({
  games = defaultGames,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
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
  }, []);

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
          {games.map(game => (
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
