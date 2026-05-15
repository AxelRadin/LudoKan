import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import RateReviewIcon from '@mui/icons-material/RateReview';
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

const NAV_ITEMS: ReadonlyArray<{
  label: string;
  icon: ReactNode;
  path: string;
  permission?: string;
  anyPermissions?: readonly string[];
}> = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/admin/dashboard',
    permission: 'dashboard.view',
  },
  {
    label: 'Activité admin',
    icon: <HistoryOutlinedIcon />,
    path: '/admin/activity',
    permission: 'admin_action_read',
  },
  {
    label: 'Utilisateurs',
    icon: <PeopleIcon />,
    path: '/admin/users',
    permission: 'user.view',
  },
  {
    label: 'Jeux',
    icon: <SportsEsportsIcon />,
    path: '/admin/games',
    permission: 'game_read',
  },
  {
    label: 'Notes et avis',
    icon: <RateReviewIcon />,
    path: '/admin/reviews',
    anyPermissions: ['review_read', 'rating_read'],
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
  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.anyPermissions?.length) {
      return item.anyPermissions.some(p => hasPermission(user, p));
    }
    return item.permission ? hasPermission(user, item.permission) : false;
  });
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
            key={item.path + item.label}
            selected={
              pathname === item.path ||
              (item.path === '/admin/reviews' &&
                pathname.startsWith('/admin/reviews')) ||
              (item.path === '/admin/activity' &&
                pathname.startsWith('/admin/activity'))
            }
            onClick={() => {
              navigate(item.path);
              if (!isDesktop) onClose();
            }}
            sx={{
              px: 3,
              py: 1.5,
              color:
                pathname === item.path ||
                (item.path === '/admin/reviews' &&
                  pathname.startsWith('/admin/reviews')) ||
                (item.path === '/admin/activity' &&
                  pathname.startsWith('/admin/activity'))
                  ? 'common.white'
                  : 'grey.400',
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
