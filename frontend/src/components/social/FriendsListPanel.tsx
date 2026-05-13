import { Avatar, Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import type { FriendRow } from '../../api/social';

const FONT_BODY = "'DM Sans', system-ui, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

type FriendsListPanelProps = Readonly<{
  friends: FriendRow[];
  loading: boolean;
  borderColor: string;
  titleColor: string;
  mutedColor: string;
  accentColor: string;
  isDark: boolean;
}>;

export default function FriendsListPanel({
  friends,
  loading,
  borderColor,
  titleColor,
  mutedColor,
  accentColor,
  isDark,
}: FriendsListPanelProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (friends.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography
          sx={{ fontFamily: FONT_BODY, color: mutedColor, fontSize: 15 }}
        >
          {t('profilePage.friendsListEmpty')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 1.5,
        justifyContent: { xs: 'center', sm: 'flex-start' },
        pt: 1,
      }}
    >
      {friends.map(f => (
        <Box
          key={f.id}
          component={RouterLink}
          to={`/u/${encodeURIComponent(f.pseudo)}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            textDecoration: 'none',
            color: titleColor,
            py: 1,
            px: 1.5,
            borderRadius: 2,
            border: `1px solid ${borderColor}`,
            fontFamily: FONT_BODY,
            '&:hover': {
              bgcolor: isDark
                ? 'rgba(255,255,255,0.06)'
                : 'rgba(211,47,47,0.06)',
              borderColor: accentColor,
            },
          }}
        >
          <Avatar
            src={f.avatar_url || undefined}
            sx={{ width: 40, height: 40, fontFamily: FONT_DISPLAY }}
          >
            {f.pseudo[0]?.toUpperCase() || '?'}
          </Avatar>
          <Typography sx={{ fontWeight: 600, fontSize: 15 }}>
            {f.pseudo}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
