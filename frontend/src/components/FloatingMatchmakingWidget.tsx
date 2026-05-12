import ChatIcon from '@mui/icons-material/Chat';
import GroupIcon from '@mui/icons-material/Group';
import RadarIcon from '@mui/icons-material/Radar';
import {
  Badge,
  Box,
  CircularProgress,
  Fab,
  Typography,
  keyframes,
} from '@mui/material';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';

const pulseRadar = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(255, 64, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0); }
`;

interface FloatingMatchmakingWidgetProps {
  readonly startedAt: Date | null;
  readonly hasNewMatch?: boolean;
  readonly party?: any | null;
  readonly onClick: () => void;
}

export default function FloatingMatchmakingWidget({
  startedAt,
  hasNewMatch,
  party,
  onClick,
}: FloatingMatchmakingWidgetProps) {
  const elapsedTime = useMatchmakingTimer(startedAt);

  const isChatPhase = party && party.status === 'chat_active';
  const isLobbyPhase = party && !isChatPhase;
  const isRadarPhase = !party && startedAt;

  let icon = <RadarIcon />;
  let text = elapsedTime;
  let color: 'primary' | 'secondary' | 'success' | 'warning' = 'primary';
  let isPulsing = false;

  if (isChatPhase) {
    icon = <ChatIcon />;
    text = 'Chat actif';
    color = 'success';
  } else if (isLobbyPhase) {
    icon = <GroupIcon />;
    const activeMembersCount =
      party.members?.filter((m: any) => !m.left_at).length || 0;

    if (party.status === 'open') {
      text = `Lobby (${activeMembersCount}/${party.max_players})`;
    } else if (party.status === 'waiting_ready') {
      text = 'Prêt ?';
      color = 'warning';
      isPulsing = true;
    } else if (party.status === 'waiting_ready_for_chat') {
      text = 'Valider chat';
      color = 'warning';
      isPulsing = true;
    } else if (party.status === 'countdown') {
      text = 'Ouverture...';
      icon = <CircularProgress size={24} color="inherit" />;
    } else {
      text = 'Lobby';
    }
  } else if (isRadarPhase) {
    icon = <RadarIcon />;
    text = elapsedTime;
    color = 'primary';
    isPulsing = true;
  }

  if (!isRadarPhase && !isLobbyPhase && !isChatPhase) return null;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        bgcolor: 'background.paper',
        pl: 2,
        pr: 1,
        py: 0.5,
        borderRadius: 8,
        boxShadow: 3,
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.05)',
        },
        ...(isPulsing && !hasNewMatch
          ? { animation: `${pulseRadar} 2s infinite` }
          : {}),
      }}
    >
      <Typography variant="body2" fontWeight="bold" color="text.primary">
        {text}
      </Typography>

      <Badge color="error" variant="dot" invisible={!hasNewMatch}>
        <Fab
          color={color}
          size="medium"
          disableRipple
          sx={{
            pointerEvents: 'none',
            boxShadow: 'none',
          }}
        >
          {icon}
        </Fab>
      </Badge>
    </Box>
  );
}
