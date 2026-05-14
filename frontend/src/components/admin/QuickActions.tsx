import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { hasPermission } from '../../utils/adminPermissions';

const ACTIONS = [
  {
    label: 'Gérer les utilisateurs',
    icon: <PeopleIcon fontSize="small" />,
    path: '/admin/users',
    permission: 'user.view',
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
  const visibleActions = ACTIONS.filter(action =>
    hasPermission(user, action.permission)
  );

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
            key={action.path}
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
