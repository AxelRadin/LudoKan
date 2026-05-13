import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
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
          minWidth: 360,
          minHeight: 180,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <CircularProgress size={22} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: 380, maxWidth: '100vw' }}>
      {/* En-tête */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NotificationsNoneIcon
            sx={{ fontSize: '1.2rem', color: 'text.secondary' }}
          />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t('notifications.title')}
          </Typography>
          {unreadCount > 0 && (
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: 10,
                bgcolor: 'primary.main',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                lineHeight: 1.6,
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {unreadCount}
            </Box>
          )}
        </Box>

        <Tooltip title={t('notifications.markAllRead')}>
          <span>
            <IconButton
              size="small"
              onClick={() => markAllAsRead().catch(() => {})}
              disabled={unreadCount === 0}
              sx={{
                color: unreadCount > 0 ? 'primary.main' : 'text.disabled',
              }}
            >
              <DoneAllIcon sx={{ fontSize: '1.15rem' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Liste */}
      <NotificationList maxHeight={420} onItemClick={onClose} />

      {/* Pied */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          p: 1,
        }}
      >
        {hasMore && (
          <Button
            size="small"
            onClick={() => loadMoreNotifications().catch(() => {})}
            disabled={loadingMore}
            fullWidth
            sx={{ color: 'text.secondary', fontSize: '0.78rem' }}
          >
            {loadingMore
              ? t('notifications.loadingMore')
              : t('notifications.loadMore')}
          </Button>
        )}

        <Button
          size="small"
          endIcon={<OpenInNewIcon sx={{ fontSize: '0.9rem !important' }} />}
          onClick={() => {
            onClose?.();
            navigate('/notifications');
          }}
          fullWidth
          sx={{
            fontWeight: 600,
            fontSize: '0.78rem',
            color: 'primary.main',
          }}
        >
          {t('notifications.viewAll') || 'Voir toutes les notifications'}
        </Button>
      </Box>
    </Box>
  );
}
