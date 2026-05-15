import type { ReactNode } from 'react';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import RateReviewIcon from '@mui/icons-material/RateReview';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { hasPermission } from '../../utils/adminPermissions';

const ACTIONS: ReadonlyArray<{
  label: string;
  icon: ReactNode;
  path: string;
  permission?: string;
  anyPermissions?: readonly string[];
}> = [
  {
    label: 'Gérer les utilisateurs',
    icon: <PeopleIcon fontSize="small" />,
    path: '/admin/users',
    permission: 'user.view',
  },
  {
    label: 'Catalogue jeux',
    icon: <SportsEsportsIcon fontSize="small" />,
    path: '/admin/games',
    permission: 'game_read',
  },
  {
    label: 'Notes et avis',
    icon: <RateReviewIcon fontSize="small" />,
    path: '/admin/reviews',
    anyPermissions: ['review_read', 'rating_read'],
  },
  {
    label: 'Statistiques détaillées',
    icon: <BarChartOutlinedIcon fontSize="small" />,
    path: '/admin/stats',
    permission: 'dashboard.view',
  },
  {
    label: 'Journal des actions',
    icon: <HistoryOutlinedIcon fontSize="small" />,
    path: '/admin/activity',
    permission: 'admin_action_read',
  },
  {
    label: 'Voir le support',
    icon: <ConfirmationNumberIcon fontSize="small" />,
    path: '/admin/tickets',
    permission: 'support.view',
  },
  {
    label: 'Voir les reports',
    icon: <ReportIcon fontSize="small" />,
    path: '/admin/reports',
    permission: 'report_read',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const visibleActions = ACTIONS.filter(action => {
    if (action.anyPermissions?.length) {
      return action.anyPermissions.some(p => hasPermission(user, p));
    }
    return action.permission ? hasPermission(user, action.permission) : false;
  });

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="caption"
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'text.secondary',
          display: 'block',
          mb: 2,
        }}
      >
        Actions rapides
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {visibleActions.map(action => (
          <Box
            key={action.path + action.label}
            component="button"
            onClick={() => navigate(action.path)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              background: 'none',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              px: '20px',
              py: '10px',
              fontSize: 13,
              fontWeight: 700,
              color: 'text.primary',
              cursor: 'pointer',
              transition: 'border-color 0.15s, transform 0.1s',
              '&:hover': {
                borderColor: 'text.primary',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {action.icon}
            {action.label}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
