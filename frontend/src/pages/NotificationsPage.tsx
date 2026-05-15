import DoneAllIcon from '@mui/icons-material/DoneAll';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useOnboarding, TOUR_KEYS } from '../hooks/useOnboarding';
import { useTour } from '../onboarding/useTour';
import { NOTIFICATIONS_TOUR_STEPS } from '../onboarding/tourSteps';
import { useTranslation } from 'react-i18next';
import { fetchAllUnreadNotifications } from '../api/notifications';
import NotificationList from '../components/notifications/NotificationList';
import PageLayout from '../components/PageLayout';
import { useNotifications } from '../contexts/NotificationsContext';
import type { NotificationItem } from '../types/notification';

type FilterMode = 'all' | 'unread';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const {
    hasMore,
    loadingMore,
    unreadCount,
    markAllAsRead,
    loadMoreNotifications,
  } = useNotifications();

  const NOTIF_OPTIONAL_STEPS = useMemo(() => new Set([0, 1, 2]), []);
  const { shouldShow, markAsDone } = useOnboarding(TOUR_KEYS.notifications);
  const { startTour } = useTour({
    steps: NOTIFICATIONS_TOUR_STEPS,
    optionalSteps: NOTIF_OPTIONAL_STEPS,
    onDone: markAsDone,
  });

  useEffect(() => {
    if (!shouldShow) return;
    const timer = setTimeout(() => startTour(), 800);
    return () => clearTimeout(timer);
  }, [shouldShow, startTour]);

  const [filter, setFilter] = useState<FilterMode>('all');

  // État pour les non-lues chargées depuis le backend
  const [unreadNotifications, setUnreadNotifications] = useState<
    NotificationItem[]
  >([]);
  const [loadingUnread, setLoadingUnread] = useState(false);

  const isUnread = filter === 'unread';

  // Charge toutes les non-lues depuis le backend quand on bascule sur ce filtre
  useEffect(() => {
    if (!isUnread) return;
    setLoadingUnread(true);
    fetchAllUnreadNotifications()
      .then(data => setUnreadNotifications(data))
      .catch(() => {})
      .finally(() => setLoadingUnread(false));
  }, [isUnread]);

  // Rafraîchit la liste non-lues après un "tout marquer comme lu"
  const handleMarkAllAsRead = async () => {
    await markAllAsRead().catch(() => {});
    if (isUnread) {
      setUnreadNotifications([]);
    }
  };

  // Rendu de la liste selon l'état
  let listContent;
  if (isUnread && loadingUnread) {
    listContent = (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          py: 8,
        }}
      >
        <CircularProgress size={28} sx={{ color: 'primary.main' }} />
      </Box>
    );
  } else if (isUnread) {
    listContent = <NotificationList overrideItems={unreadNotifications} />;
  } else {
    listContent = <NotificationList />;
  }

  const unreadSuffix = unreadCount > 1 ? 's' : '';
  const unreadLabel = i18n.language.startsWith('fr')
    ? `non-lue${unreadSuffix}`
    : 'unread';

  return (
    <PageLayout title={t('notifications.title')} backTo="/">
      <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        {/* En-tête de page */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 3,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          {/* Titre + compteur */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 42,
                height: 42,
                borderRadius: '12px',
                bgcolor: 'primary.main',
                color: '#fff',
              }}
            >
              <NotificationsNoneIcon />
            </Box>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 800, lineHeight: 1.2 }}
              >
                {t('notifications.title')}
              </Typography>
              {unreadCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {unreadCount} {unreadLabel}
                </Typography>
              )}
            </Box>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                sx={{
                  bgcolor: 'primary.main',
                  color: '#fff',
                  fontWeight: 700,
                  height: 22,
                }}
              />
            )}
          </Box>

          {/* Filtres + action */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Toggle All / Non-lus */}
            <ToggleButtonGroup
              data-tour="notif-filter"
              value={filter}
              exclusive
              onChange={(_, val) => {
                if (val !== null) setFilter(val);
              }}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 1.75,
                  py: 0.5,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px !important',
                  border: '1px solid',
                  borderColor: 'divider',
                  color: 'text.secondary',
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: '#fff',
                    borderColor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                },
                '& .MuiToggleButtonGroup-grouped:not(:last-of-type)': {
                  mr: 0.5,
                },
              }}
            >
              <ToggleButton value="all">
                {i18n.language.startsWith('fr') ? 'Toutes' : 'All'}
              </ToggleButton>
              <ToggleButton value="unread">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                  {i18n.language.startsWith('fr') ? 'Non-lues' : 'Unread'}
                  {unreadCount > 0 && (
                    <Box
                      sx={{
                        px: 0.6,
                        py: 0.05,
                        borderRadius: 10,
                        bgcolor: isUnread
                          ? 'rgba(255,255,255,0.25)'
                          : 'primary.main',
                        color: '#fff',
                        fontSize: '0.6rem',
                        fontWeight: 700,
                        lineHeight: 1.6,
                        minWidth: 16,
                        textAlign: 'center',
                      }}
                    >
                      {unreadCount}
                    </Box>
                  )}
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>

            {/* Tout marquer comme lu */}
            <Tooltip title={t('notifications.markAllRead')}>
              <span data-tour="notif-mark-all">
                <IconButton
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  sx={{
                    border: '1px solid',
                    borderColor: unreadCount > 0 ? 'primary.main' : 'divider',
                    color: unreadCount > 0 ? 'primary.main' : 'text.disabled',
                    borderRadius: '10px',
                    gap: 0.75,
                    px: 1.5,
                  }}
                >
                  <DoneAllIcon sx={{ fontSize: '1.1rem' }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      display: { xs: 'none', sm: 'block' },
                      fontSize: '0.75rem',
                    }}
                  >
                    {t('notifications.markAllRead')}
                  </Typography>
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        {/* Carte principale */}
        <Paper
          data-tour="notif-list"
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
            bgcolor: 'background.paper',
          }}
        >
          {listContent}
        </Paper>

        {/* Charger plus (uniquement en mode "Toutes") */}
        {hasMore && !isUnread && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => loadMoreNotifications().catch(() => {})}
              disabled={loadingMore}
              sx={{ px: 4, borderRadius: '10px' }}
            >
              {loadingMore
                ? t('notifications.loadingMore')
                : t('notifications.loadMore')}
            </Button>
          </Box>
        )}
      </Container>
    </PageLayout>
  );
}
