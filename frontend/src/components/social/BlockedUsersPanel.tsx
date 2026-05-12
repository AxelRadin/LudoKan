import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { BlockedUserRow } from '../../api/social';

const FONT_BODY = "'DM Sans', system-ui, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

type BlockedUsersPanelProps = Readonly<{
  users: BlockedUserRow[];
  loading: boolean;
  busyUserId: number | null;
  onUnblock: (userId: number) => void;
  borderColor: string;
  titleColor: string;
  mutedColor: string;
}>;

export default function BlockedUsersPanel({
  users,
  loading,
  busyUserId,
  onUnblock,
  borderColor,
  titleColor,
  mutedColor,
}: BlockedUsersPanelProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (users.length === 0) {
    return (
      <Typography
        sx={{ fontFamily: FONT_BODY, color: mutedColor, fontSize: 15, py: 2 }}
      >
        {t('friendsPage.blockedEmpty')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ pt: 1 }}>
      {users.map(u => (
        <Box
          key={u.id}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={u.avatar_url || undefined}
              sx={{ width: 44, height: 44, fontFamily: FONT_DISPLAY }}
            >
              {u.pseudo[0]?.toUpperCase() || '?'}
            </Avatar>
            <Typography
              sx={{ fontFamily: FONT_BODY, fontWeight: 700, color: titleColor }}
            >
              {u.pseudo}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            color="inherit"
            disabled={busyUserId === u.id}
            onClick={() => onUnblock(u.id)}
            sx={{
              fontFamily: FONT_BODY,
              alignSelf: { xs: 'stretch', sm: 'center' },
            }}
          >
            {busyUserId === u.id ? (
              <CircularProgress size={18} />
            ) : (
              t('friendsPage.unblock')
            )}
          </Button>
        </Box>
      ))}
    </Stack>
  );
}
