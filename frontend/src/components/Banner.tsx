import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

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
      <Typography variant="h5" fontWeight="bold" color="black">
        Ne soyez plus perdus dans votre collection de jeux-vidéo !
      </Typography>
    </Box>
  );
};

export default Banner;