import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import { Box, Paper, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';

interface FloatingMatchmakingWidgetProps {
  readonly startedAt: Date | null;
  readonly status: 'searching' | 'lobby' | 'chat';
  readonly onClick: () => void;
}

export default function FloatingMatchmakingWidget({
  startedAt,
  status,
  onClick,
}: FloatingMatchmakingWidgetProps) {
  const elapsedTime = useMatchmakingTimer(startedAt);

  if (!startedAt) return null;

  const isLobby = status === 'lobby';
  const isChat = status === 'chat';

  const bgColor = isChat ? '#4caf50' : isLobby ? '#1976d2' : '#fff';
  const textColor = isChat || isLobby ? '#fff' : 'text.primary';
  const pulseColor = isChat
    ? 'rgba(76, 175, 80, 0.7)'
    : 'rgba(25, 118, 210, 0.7)';

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
        backgroundColor: bgColor,
        color: textColor,
        border: isChat || isLobby ? 'none' : '1px solid #e0e0e0',
        animation: isChat || isLobby ? 'pulseWidget 2s infinite' : 'none',
        '@keyframes pulseWidget': {
          '0%': { boxShadow: `0 0 0 0 ${pulseColor}` },
          '70%': { boxShadow: `0 0 0 10px rgba(0,0,0,0)` },
          '100%': { boxShadow: `0 0 0 0 rgba(0,0,0,0)` },
        },
        transition: 'all 0.3s ease',
      }}
    >
      {isChat ? (
        <ChatBubbleIcon />
      ) : isLobby ? (
        <CheckCircleOutlineIcon />
      ) : (
        <CircularProgress size={20} color="inherit" thickness={5} />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 'bold', lineHeight: 1.2 }}
        >
          {isChat
            ? 'Ouvrir le chat'
            : isLobby
              ? 'Lobby en cours'
              : 'Recherche en cours...'}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
          {elapsedTime}
        </Typography>
      </Box>
    </Paper>
  );
}
