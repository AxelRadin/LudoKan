import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface AdminPageHeaderProps {
  readonly title: string;
}

/**
 * En-tête standard pour les pages d'administration avec un bouton de retour.
 */
export default function AdminPageHeader({ title }: AdminPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/admin');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexWrap: 'wrap',
        alignItems: 'start',
        gap: 1,
        mb: 3,
      }}
    >
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        variant="outlined"
        size="small"
        sx={{ fontWeight: 600 }}
      >
        Retour
      </Button>
      <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {title}
      </Typography>
    </Box>
  );
}
