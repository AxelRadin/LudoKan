import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';
import SearchBar from './SearchBar';

export const Banner: React.FC = () => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(90deg, #ffd3d3 0%, #ff6464 100%)',
        py: 6,
        px: 4,
        textAlign: 'left',
      }}
    >
      <Typography variant="h5" fontWeight="bold" color="black" mb={3}>
        Ne soyez plus perdus dans votre collection de jeux-vidéo !
      </Typography>
      <SearchBar />
    </Box>
  );
};

export default Banner;
