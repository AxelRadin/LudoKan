import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { FriendRequestRow } from '../../api/social';

const FONT_BODY = "'DM Sans', system-ui, sans-serif";

type FriendRequestsPanelProps = Readonly<{
  incoming: FriendRequestRow[];
  outgoing: FriendRequestRow[];
  loading: boolean;
  busyRequestId: number | null;
  onAcceptIncoming: (id: number) => void;
  onDeclineIncoming: (id: number) => void;
  onCancelOutgoing: (id: number) => void;
  borderColor: string;
  titleColor: string;
  mutedColor: string;
}>;

export default function FriendRequestsPanel({
  incoming,
  outgoing,
  loading,
  busyRequestId,
  onAcceptIncoming,
  onDeclineIncoming,
  onCancelOutgoing,
  borderColor,
  titleColor,
  mutedColor,
}: FriendRequestsPanelProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ pt: 1 }}>
      <Box>
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: mutedColor,
            mb: 1.5,
          }}
        >
          {t('profilePage.friendRequestsIncoming')}
        </Typography>
        {incoming.length === 0 ? (
          <Typography
            sx={{ fontFamily: FONT_BODY, fontSize: 14, color: mutedColor }}
          >
            {t('profilePage.friendRequestsIncomingEmpty')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {incoming.map(req => (
              <Box
                key={req.id}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Box
                  component={Link}
                  to={`/u/${encodeURIComponent(req.from_user.pseudo)}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    textDecoration: 'none',
                    color: titleColor,
                  }}
                >
                  <Avatar
                    src={req.from_user.avatar_url || undefined}
                    sx={{ width: 44, height: 44 }}
                  >
                    {req.from_user.pseudo[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography sx={{ fontFamily: FONT_BODY, fontWeight: 700 }}>
                    {req.from_user.pseudo}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  justifyContent={{ xs: 'stretch', sm: 'flex-end' }}
                >
                  <Button
                    variant="contained"
                    size="small"
                    disabled={busyRequestId === req.id}
                    onClick={() => onAcceptIncoming(req.id)}
                    sx={{ fontFamily: FONT_BODY }}
                  >
                    {t('publicUserProfile.accept')}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="inherit"
                    disabled={busyRequestId === req.id}
                    onClick={() => onDeclineIncoming(req.id)}
                    sx={{ fontFamily: FONT_BODY }}
                  >
                    {t('publicUserProfile.decline')}
                  </Button>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
      </Box>

      <Divider sx={{ borderColor }} />

      <Box>
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: mutedColor,
            mb: 1.5,
          }}
        >
          {t('profilePage.friendRequestsOutgoing')}
        </Typography>
        {outgoing.length === 0 ? (
          <Typography
            sx={{ fontFamily: FONT_BODY, fontSize: 14, color: mutedColor }}
          >
            {t('profilePage.friendRequestsOutgoingEmpty')}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {outgoing.map(req => (
              <Box
                key={req.id}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'stretch', sm: 'center' },
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${borderColor}`,
                }}
              >
                <Box
                  component={Link}
                  to={`/u/${encodeURIComponent(req.to_user.pseudo)}`}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    textDecoration: 'none',
                    color: titleColor,
                  }}
                >
                  <Avatar
                    src={req.to_user.avatar_url || undefined}
                    sx={{ width: 44, height: 44 }}
                  >
                    {req.to_user.pseudo[0]?.toUpperCase() || '?'}
                  </Avatar>
                  <Typography sx={{ fontFamily: FONT_BODY, fontWeight: 700 }}>
                    {req.to_user.pseudo}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  color="inherit"
                  disabled={busyRequestId === req.id}
                  onClick={() => onCancelOutgoing(req.id)}
                  sx={{
                    fontFamily: FONT_BODY,
                    alignSelf: { xs: 'stretch', sm: 'center' },
                  }}
                >
                  {t('publicUserProfile.cancelRequest')}
                </Button>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
