import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  {
    label: 'Gérer les utilisateurs',
    icon: <PeopleIcon fontSize="small" />,
    path: '/admin/users',
  },
  {
    label: 'Voir les tickets',
    icon: <ConfirmationNumberIcon fontSize="small" />,
    path: '/admin/tickets',
  },
  {
    label: 'Voir les reports',
    icon: <ReportIcon fontSize="small" />,
    path: '/admin/reports',
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="caption"
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#aaa',
          display: 'block',
          mb: 2,
        }}
      >
        Actions rapides
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {ACTIONS.map(action => (
          <Box
            key={action.path}
            component="button"
            onClick={() => navigate(action.path)}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              background: 'none',
              border: '1.5px solid rgba(0,0,0,0.15)',
              borderRadius: '10px',
              px: '20px',
              py: '10px',
              fontSize: 13,
              fontWeight: 700,
              color: '#111',
              cursor: 'pointer',
              transition: 'border-color 0.15s, transform 0.1s',
              '&:hover': {
                borderColor: 'rgba(0,0,0,0.4)',
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
