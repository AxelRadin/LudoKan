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
import { useMemo } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import { type Party } from '../services/party';

const pulseRadar = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(255, 64, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 64, 129, 0); }
`;

// Hook pour obtenir les couleurs dynamiques basées sur le thème
function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(
    () => ({
      widgetBg: isDark ? 'rgba(42,32,32,0.95)' : 'background.paper',
      text: isDark ? '#f5e6e6' : 'text.primary',
      border: isDark ? 'rgba(74,48,48,0.6)' : 'transparent',
      isDark,
    }),
    [isDark]
  );
}

interface FloatingMatchmakingWidgetProps {
  readonly startedAt: Date | null;
  readonly hasNewMatch?: boolean;
  readonly party?: Party | null;
  readonly onClick: () => void;
}

function getWidgetUIState(
  party: Party | null | undefined,
  elapsedTime: string
) {
  if (party?.status === 'chat_active') {
    return {
      icon: <ChatIcon />,
      text: 'Chat actif',
      color: 'success' as const,
      isPulsing: false,
    };
  }

  if (party) {
    const activeMembersCount =
      party.members?.filter((m: any) => !m.left_at).length || 0;

    switch (party.status) {
      case 'open':
        return {
          icon: <GroupIcon />,
          text: `Lobby (${activeMembersCount}/${party.max_players})`,
          color: 'primary' as const,
          isPulsing: false,
        };
      case 'waiting_ready':
        return {
          icon: <GroupIcon />,
          text: 'Prêt ?',
          color: 'warning' as const,
          isPulsing: true,
        };
      case 'waiting_ready_for_chat':
        return {
          icon: <GroupIcon />,
          text: 'Valider chat',
          color: 'warning' as const,
          isPulsing: true,
        };
      case 'countdown':
        return {
          icon: <CircularProgress size={24} color="inherit" />,
          text: 'Ouverture...',
          color: 'primary' as const,
          isPulsing: false,
        };
      default:
        return {
          icon: <GroupIcon />,
          text: 'Lobby',
          color: 'primary' as const,
          isPulsing: false,
        };
    }
  }

  return {
    icon: <RadarIcon />,
    text: elapsedTime,
    color: 'primary' as const,
    isPulsing: true,
  };
}

export default function FloatingMatchmakingWidget({
  startedAt,
  hasNewMatch,
  party,
  onClick,
}: FloatingMatchmakingWidgetProps) {
  const elapsedTime = useMatchmakingTimer(startedAt);
  const C = useThemeColors();

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
        bgcolor: C.widgetBg,
        backdropFilter: 'blur(20px)',
        border: `1px solid ${C.border}`,
        pl: 2,
        pr: 1,
        py: 0.5,
        borderRadius: 8,
        boxShadow: C.isDark ? '0 4px 20px rgba(0,0,0,0.4)' : 3,
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.05)' },
        ...(isPulsing && !hasNewMatch
          ? { animation: `${pulseRadar} 2s infinite` }
          : {}),
      }}
    >
      <Typography variant="body2" fontWeight="bold" sx={{ color: C.text }}>
        {text}
      </Typography>

      <Badge color="error" variant="dot" invisible={!hasNewMatch}>
        <Fab
          color={color}
          size="medium"
          disableRipple
          sx={{ pointerEvents: 'none', boxShadow: 'none' }}
        >
          {icon}
        </Fab>
      </Badge>
    </Box>
  );
}
