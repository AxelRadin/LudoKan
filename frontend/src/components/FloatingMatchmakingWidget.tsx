import ChatIcon from '@mui/icons-material/Chat';
import GroupIcon from '@mui/icons-material/Group';
import RadarIcon from '@mui/icons-material/Radar';
import { Badge, Box, CircularProgress, Fab, Typography, keyframes } from '@mui/material';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import { type Party } from '../services/party';

const pulseRadar = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(255, 64, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0); }
`;

interface FloatingMatchmakingWidgetProps {
  readonly startedAt: Date | null;
  readonly hasNewMatch?: boolean;
  readonly party?: Party | null;
  readonly onClick: () => void;
}

function getWidgetUIState(party: Party | null | undefined, elapsedTime: string) {
  if (party?.status === 'chat_active') {
    return { icon: <ChatIcon />, text: "Chat actif", color: 'success' as const, isPulsing: false };
  }

  if (party) {
    const activeMembersCount = party.members?.filter((m: any) => !m.left_at).length || 0;

    switch (party.status) {
      case 'open':
        return { icon: <GroupIcon />, text: `Lobby (${activeMembersCount}/${party.max_players})`, color: 'primary' as const, isPulsing: false };
      case 'waiting_ready':
        return { icon: <GroupIcon />, text: "Prêt ?", color: 'warning' as const, isPulsing: true };
      case 'waiting_ready_for_chat':
        return { icon: <GroupIcon />, text: "Valider chat", color: 'warning' as const, isPulsing: true };
      case 'countdown':
        return { icon: <CircularProgress size={24} color="inherit" />, text: "Ouverture...", color: 'primary' as const, isPulsing: false };
      default:
        return { icon: <GroupIcon />, text: "Lobby", color: 'primary' as const, isPulsing: false };
    }
  }

  return { icon: <RadarIcon />, text: elapsedTime, color: 'primary' as const, isPulsing: true };
}

export default function FloatingMatchmakingWidget({
  startedAt,
  hasNewMatch,
  party,
  onClick,
}: FloatingMatchmakingWidgetProps) {
  const elapsedTime = useMatchmakingTimer(startedAt);

  const isChatPhase = party?.status === 'chat_active';
  const isLobbyPhase = party && !isChatPhase;
  const isRadarPhase = !party && startedAt;

  if (!isRadarPhase && !isLobbyPhase && !isChatPhase) return null;

  const { icon, text, color, isPulsing } = getWidgetUIState(party, elapsedTime);

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
        '&:hover': { transform: 'scale(1.05)' },
        ...(isPulsing && !hasNewMatch ? { animation: `${pulseRadar} 2s infinite` } : {}),
      }}
    >
      <Typography variant="body2" fontWeight="bold" color="text.primary">
        {text}
      </Typography>

      <Badge color="error" variant="dot" invisible={!hasNewMatch}>
        <Fab color={color} size="medium" disableRipple sx={{ pointerEvents: 'none', boxShadow: 'none' }}>
          {icon}
        </Fab>
      </Badge>
    </Box>
  );
}