import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PersonIcon from '@mui/icons-material/Person';
import RadarIcon from '@mui/icons-material/Radar';
import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { keyframes } from '@mui/system';
import { useTranslation } from 'react-i18next';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';

const pulseRadar = keyframes`
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
`;

interface Match {
  id: number;
  user: any;
  distance_km: number;
}

interface MatchmakingModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCancel: () => void;
  readonly matches: Match[];
  readonly startedAt: Date | null;
  readonly game: { readonly name: string; readonly image: string } | null;
  readonly onContactPlayer?: (targetUserId: number) => void;
}

export default function MatchmakingModal({
  open,
  onClose,
  onCancel,
  matches,
  startedAt,
  game,
  onContactPlayer,
}: MatchmakingModalProps) {
  const { t } = useTranslation();
  const elapsedTime = useMatchmakingTimer(startedAt);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, overflow: 'hidden', maxWidth: 750 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 160,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          bgcolor: 'black',
        }}
      >
        {game?.image && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${game.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(4px) brightness(0.4)',
              zIndex: 0,
            }}
          />
        )}
        <Box
          sx={{ position: 'relative', zIndex: 1, textAlign: 'center', px: 2 }}
        >
          <Typography
            variant="h5"
            sx={{
              color: '#fff',
              fontWeight: 800,
              mb: 1,
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {game?.name || t('matchmakingModal.searchTitle')}
          </Typography>
          {startedAt && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(0,0,0,0.5)',
                px: 2,
                py: 0.5,
                borderRadius: 4,
                color: '#fff',
              }}
            >
              <AccessTimeIcon fontSize="small" />
              <Typography variant="body2" fontWeight="bold">
                {elapsedTime}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <DialogContent sx={{ bgcolor: '#f8f9fa', p: 3 }}>
        {matches.length > 0 ? (
          <List sx={{ pt: 0 }}>
            {matches.map(match => {
              const user = match.user;
              const targetUserId =
                typeof user === 'object' && user !== null ? user.id : user;
              const userName =
                typeof user === 'object' && user !== null
                  ? user.username ||
                    t('matchmakingModal.player', { id: user.id })
                  : t('matchmakingModal.player', { id: user });

              return (
                <Paper
                  key={match.id}
                  elevation={1}
                  sx={{ mb: 2, borderRadius: 3, overflow: 'hidden' }}
                >
                  <ListItem sx={{ py: 2 }}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{ bgcolor: 'primary.main', width: 50, height: 50 }}
                      >
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={userName}
                      secondary={t('matchmakingModal.distance', {
                        km: match.distance_km,
                      })}
                      primaryTypographyProps={{
                        fontWeight: 700,
                        variant: 'subtitle1',
                      }}
                      secondaryTypographyProps={{
                        color: 'success.main',
                        fontWeight: 600,
                      }}
                      sx={{ ml: 1 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      color="primary"
                      startIcon={<ChatBubbleOutlineIcon />}
                      sx={{ borderRadius: 8, textTransform: 'none', px: 2 }}
                      onClick={() => onContactPlayer?.(targetUserId)}
                    >
                      {t('matchmakingModal.contact')}
                    </Button>
                  </ListItem>
                </Paper>
              );
            })}
          </List>
        ) : (
          <Box
            sx={{
              py: { xs: 6, md: 10 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Box sx={{ position: 'relative', width: 100, height: 100, mb: 5 }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  animation: `${pulseRadar} 2s infinite ease-out`,
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  animation: `${pulseRadar} 2s infinite ease-out`,
                  animationDelay: '1s',
                }}
              />
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: 'primary.main',
                  zIndex: 2,
                  position: 'relative',
                }}
              >
                <RadarIcon sx={{ fontSize: 48 }} />
              </Avatar>
            </Box>
            <Typography
              variant="h5"
              fontWeight={700}
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t('matchmakingModal.analyzing')}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 450, lineHeight: 1.6 }}
            >
              {t('matchmakingModal.searchDescription')}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          bgcolor: '#f8f9fa',
        }}
      >
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          {t('matchmakingModal.minimize')}
        </Button>
        {startedAt && (
          <Button
            onClick={onCancel}
            color="error"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          >
            {t('matchmakingModal.cancel')}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
