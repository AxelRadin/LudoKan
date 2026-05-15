import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/useAuth';
import { hasPermission } from '../../utils/adminPermissions';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/admin/dashboard',
    permission: 'dashboard.view',
  },
  {
    label: 'Utilisateurs',
    icon: <PeopleIcon />,
    path: '/admin/users',
    permission: 'user.view',
  },
  {
    label: 'Support',
    icon: <ConfirmationNumberIcon />,
    path: '/admin/tickets',
    permission: 'support.view',
  },
  {
    label: 'Reports',
    icon: <ReportIcon />,
    path: '/admin/reports',
    permission: 'report_read',
  },
];

type Props = Readonly<{
  isDesktop: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}>;

export default function AdminSidebar({
  isDesktop,
  mobileOpen,
  onClose,
}: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const visibleItems = NAV_ITEMS.filter(item =>
    hasPermission(user, item.permission)
  );
  const content = (
    <Box
      sx={{
        width: 240,
        minHeight: '100%',
        bgcolor: 'grey.900',
        color: 'common.white',
        display: 'flex',
        flexDirection: 'column',
        py: 2.5,
      }}
    >
      <Typography
        sx={{
          px: 3,
          mb: 2.5,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: '0.08em',
          color: 'common.white',
        }}
      >
        LUDOKAN ADMIN
      </Typography>

      <List disablePadding>
        {visibleItems.map(item => (
          <ListItemButton
            key={item.path}
            selected={pathname === item.path}
            onClick={() => {
              navigate(item.path);
              if (!isDesktop) onClose();
            }}
            sx={{
              px: 3,
              py: 1.5,
              color: pathname === item.path ? 'common.white' : 'grey.400',
              '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
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

  if (isDesktop) {
    return (
      <Drawer
        variant="permanent"
        open
        PaperProps={{
          sx: {
            position: 'static',
            width: 240,
            border: 'none',
          },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={mobileOpen}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      PaperProps={{ sx: { width: 240, border: 'none' } }}
    >
      {content}
    </Drawer>
  );
}
