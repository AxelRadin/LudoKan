import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <Box
      sx={{
        background: 'linear-gradient(90deg, #ffd3d3 0%, #ff6464 100%)',
        py: 6,
        px: 4,
        textAlign: 'left',
      }}
    >
      <Typography variant="h5" fontWeight="bold">
        Ne soyez plus perdus
        <br />
        dans votre collection
        <br />
        de jeux-vidéo
      </Typography>
    </Box>
  );
};

export default HeroSection;