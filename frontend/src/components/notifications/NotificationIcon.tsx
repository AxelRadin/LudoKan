import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  Badge,
  IconButton,
  Menu,
  Tooltip,
  type MenuProps,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationsContext';
import NotificationDropdown from './NotificationDropdown';

type NotificationIconProps = {
  mobile?: boolean;
  menuProps?: Partial<MenuProps>;
};

export default function NotificationIcon({
  mobile = false,
  menuProps,
}: NotificationIconProps) {
  const { t } = useTranslation();
  const { unreadCount, refreshNotifications } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);
  const badgeContent = unreadCount > 9 ? '9+' : unreadCount;

  const openMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    refreshNotifications().catch(() => {});
  };

  const closeMenu = () => setAnchorEl(null);

  return (
    <>
      <Tooltip title={t('notifications.open')} arrow>
        <IconButton
          color="inherit"
          onClick={openMenu}
          aria-label={t('notifications.open')}
          sx={mobile ? { alignSelf: 'flex-start' } : undefined}
        >
          <Badge
            badgeContent={badgeContent}
            color="error"
            invisible={unreadCount <= 0}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            borderRadius: 2,
            mt: 1,
          },
        }}
        {...menuProps}
      >
        <NotificationDropdown />
      </Menu>
    </>
  );
}
