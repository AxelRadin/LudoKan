import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CircularProgress from '@mui/material/CircularProgress';
import { Box, Paper, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

interface FloatingMatchmakingWidgetProps {
  readonly startedAt: Date | null;
  readonly hasNewMatch: boolean;
  readonly onClick: () => void;
}

export default function FloatingMatchmakingWidget({
  startedAt,
  hasNewMatch,
  onClick,
}: FloatingMatchmakingWidgetProps) {
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');

  useEffect(() => {
    if (!startedAt) return;

    const updateTimer = () => {
      const now = new Date();
      const diffInSeconds = Math.floor(
        (now.getTime() - startedAt.getTime()) / 1000
      );

      if (diffInSeconds >= 0) {
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return null;

  return (
    <Paper
      elevation={6}
      onClick={onClick}
      sx={{
        position: 'fixed',
        top: { xs: 80, md: 75 },
        right: 10,
        zIndex: 9999,
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        borderRadius: 8,
        backgroundColor: hasNewMatch ? '#4caf50' : '#fff',
        color: hasNewMatch ? '#fff' : 'text.primary',
        border: hasNewMatch ? 'none' : '1px solid #e0e0e0',
        animation: hasNewMatch ? 'pulse 1.5s infinite' : 'none',
        '@keyframes pulse': {
          '0%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)',
          },
          '70%': {
            transform: 'scale(1.05)',
            boxShadow: '0 0 0 10px rgba(76, 175, 80, 0)',
          },
          '100%': {
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)',
          },
        },
        transition: 'all 0.3s ease',
      }}
    >
      {hasNewMatch ? (
        <GroupAddIcon />
      ) : (
        <CircularProgress size={20} color="inherit" thickness={5} />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
        >
          {hasNewMatch ? 'Joueur trouvé !' : 'Recherche en cours...'}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
          {elapsedTime}
        </Typography>
      </Box>
    </Paper>
  );
}
