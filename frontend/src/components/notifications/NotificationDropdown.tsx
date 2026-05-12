import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import NotificationList from './NotificationList';

export default function NotificationDropdown({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    loading,
    hasMore,
    loadingMore,
    unreadCount,
    markAllAsRead,
    loadMoreNotifications,
  } = useNotifications();

  if (loading) {
    return (
      <Box
        sx={{
          minWidth: 320,
          minHeight: 160,
          p: 2,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress size={22} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: 360, maxWidth: '100vw' }}>
      <Box
        sx={{
          px: 2,
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {t('notifications.title')}
        </Typography>
        <Button
          size="small"
          onClick={() => markAllAsRead().catch(() => {})}
          disabled={unreadCount === 0}
        >
          {t('notifications.markAllRead')}
        </Button>
      </Box>

      <NotificationList maxHeight={380} onItemClick={onClose} />

      <Box
        sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {hasMore && (
          <Button
            size="small"
            onClick={() => loadMoreNotifications().catch(() => {})}
            disabled={loadingMore}
            fullWidth
          >
            {loadingMore
              ? t('notifications.loadingMore')
              : t('notifications.loadMore')}
          </Button>
        )}
        <Button
          size="small"
          onClick={() => {
            onClose?.();
            navigate('/notifications');
          }}
          fullWidth
        >
          {t('notifications.viewAll') || 'Voir tout'}
        </Button>
      </Box>
    </Box>
  );
}
