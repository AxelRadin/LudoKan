import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { label: 'Utilisateurs', icon: <PeopleIcon />, path: '/admin/users' },
  {
    label: 'Tickets',
    icon: <ConfirmationNumberIcon />,
    path: '/admin/tickets',
  },
  { label: 'Reports', icon: <ReportIcon />, path: '/admin/reports' },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Box
      sx={{
        width: 220,
        minHeight: '100vh',
        bgcolor: '#111',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        py: 3,
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          px: 3,
          mb: 3,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '0.08em',
          color: '#fff',
        }}
      >
        LUDOKAN ADMIN
      </Typography>

      <List disablePadding>
        {NAV_ITEMS.map(item => (
          <ListItemButton
            key={item.path}
            selected={pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              px: 3,
              py: 1.5,
              color: pathname === item.path ? '#fff' : 'rgba(255,255,255,0.6)',
              '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
