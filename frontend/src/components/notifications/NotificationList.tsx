import CircleIcon from '@mui/icons-material/Circle';
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../../contexts/NotificationsContext';
import type { NotificationItem } from '../../types/notification';

function relativeDate(value: string, lang: string): string {
  const date = new Date(value);
  const now = Date.now();
  const deltaSeconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(deltaSeconds);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });

  if (abs < 60) return rtf.format(deltaSeconds, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSeconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(deltaSeconds / 3600), 'hour');
  return rtf.format(Math.round(deltaSeconds / 86400), 'day');
}

function notificationTitle(t: (key: string) => string, verb: string): string {
  const key = `notifications.verb.${verb}`;
  const translated = t(key);
  return translated === key ? verb.replaceAll('_', ' ') : translated;
}

function notificationDescription(notification: NotificationItem): string {
  const extraMessage =
    notification.extra &&
    typeof notification.extra === 'object' &&
    'message' in notification.extra &&
    typeof notification.extra.message === 'string'
      ? notification.extra.message
      : null;
  return (
    extraMessage ??
    notification.target?.repr ??
    notification.actor?.repr ??
    notification.verb
  );
}

type NotificationListProps = {
  maxHeight?: number | string;
  onItemClick?: () => void;
};

export default function NotificationList({
  maxHeight,
  onItemClick,
}: NotificationListProps) {
  const { t, i18n } = useTranslation();
  const { notifications, markAsRead, handleNotificationNavigation } =
    useNotifications();

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [notifications]
  );

  if (sortedNotifications.length === 0) {
    return (
      <Box sx={{ px: 2, py: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {t('notifications.empty')}
        </Typography>
      </Box>
    );
  }

  return (
    <List sx={{ py: 0, maxHeight, overflowY: 'auto' }}>
      {sortedNotifications.map(notification => (
        <ListItem
          key={notification.id}
          disablePadding
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            backgroundColor: notification.unread
              ? 'action.hover'
              : 'transparent',
          }}
          secondaryAction={
            notification.unread ? (
              <Button
                size="small"
                onClick={e => {
                  e.stopPropagation();
                  markAsRead(notification.id).catch(() => {});
                }}
              >
                {t('notifications.markRead')}
              </Button>
            ) : null
          }
        >
          <ListItemButton
            onClick={() => {
              onItemClick?.();
              handleNotificationNavigation(notification).catch(() => {});
            }}
            sx={{
              alignItems: 'flex-start',
              px: 2,
              py: 1.5,
            }}
          >
            <ListItemText
              primary={
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pr: 4,
                  }}
                >
                  {notification.unread && (
                    <CircleIcon color="error" sx={{ fontSize: 10 }} />
                  )}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: notification.unread ? 700 : 500,
                      textTransform: 'capitalize',
                    }}
                  >
                    {notificationTitle(t, notification.verb)}
                  </Typography>
                </Box>
              }
              secondary={
                <>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 0.4 }}
                  >
                    {notificationDescription(notification)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {relativeDate(notification.timestamp, i18n.language)}
                  </Typography>
                </>
              }
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}
