import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import NotificationList from '../components/notifications/NotificationList';
import PageLayout from '../components/PageLayout';
import { useNotifications } from '../contexts/NotificationsContext';

export default function NotificationsPage() {
  const { t } = useTranslation();
  const {
    hasMore,
    loadingMore,
    unreadCount,
    markAllAsRead,
    loadMoreNotifications,
  } = useNotifications();

  return (
    <PageLayout title={t('notifications.title')} backTo="/">
      <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
              pb: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              {t('notifications.title')}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => markAllAsRead().catch(() => {})}
              disabled={unreadCount === 0}
            >
              {t('notifications.markAllRead')}
            </Button>
          </Box>

          <NotificationList />

          {hasMore && (
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => loadMoreNotifications().catch(() => {})}
                disabled={loadingMore}
                sx={{ px: 4 }}
              >
                {loadingMore
                  ? t('notifications.loadingMore')
                  : t('notifications.loadMore')}
              </Button>
            </Box>
          )}
        </Paper>
      </Container>
    </PageLayout>
  );
}
