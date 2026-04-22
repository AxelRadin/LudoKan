import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import RadarIcon from '@mui/icons-material/Radar';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import { useEffect, useState } from 'react';

const pulseRadar = keyframes`
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
`;

export interface PartyMember {
  id: number;
  user: { id: number; username: string };
  is_me: boolean;
  ready: boolean;
  ready_for_chat: boolean;
}

export interface PartyInfo {
  id: number;
  status: string;
  countdown_ends_at: string | null;
  chat_room_id: string | null;
  members: PartyMember[];
}

interface MatchmakingModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCancel: () => void;
  readonly party: PartyInfo | null;
  readonly startedAt: Date | null;
  readonly game: { readonly name: string; readonly image: string } | null;
  readonly onReady: () => void;
  readonly onReadyForChat: () => void;
}

export default function MatchmakingModal({
  open,
  onClose,
  onCancel,
  party,
  startedAt,
  game,
  onReady,
  onReadyForChat,
}: MatchmakingModalProps) {
  const elapsedTime = useMatchmakingTimer(startedAt);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!party?.countdown_ends_at) {
      setCountdown(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.floor(
        (new Date(party.countdown_ends_at!).getTime() - Date.now()) / 1000
      );
      setCountdown(remaining > 0 ? remaining : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [party?.countdown_ends_at]);

  const me = party?.members.find(m => m.is_me);

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
            {party
              ? `Lobby : ${game?.name}`
              : game?.name || 'Recherche de joueurs'}
          </Typography>
          {!party && startedAt && (
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
        {party ? (
          /* ----- VUE LOBBY ----- */
          <Box>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Joueurs dans le lobby ({party.members.length})
            </Typography>
            <List sx={{ pt: 0, mb: 3 }}>
              {party.members.map(member => (
                <Paper
                  key={member.id}
                  elevation={1}
                  sx={{ mb: 1.5, borderRadius: 2, overflow: 'hidden' }}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor: member.ready_for_chat
                            ? 'success.main'
                            : 'primary.main',
                        }}
                      >
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.is_me ? 'Vous' : member.user.username}
                      secondary={
                        member.ready_for_chat
                          ? 'Prêt pour le chat'
                          : member.ready
                            ? 'Prêt'
                            : 'En attente...'
                      }
                      primaryTypographyProps={{ fontWeight: 700 }}
                      secondaryTypographyProps={{
                        color: member.ready_for_chat
                          ? 'success.main'
                          : member.ready
                            ? 'info.main'
                            : 'text.secondary',
                        fontWeight: 600,
                      }}
                    />
                    {member.ready && (
                      <CheckCircleIcon
                        color={member.ready_for_chat ? 'success' : 'info'}
                      />
                    )}
                  </ListItem>
                </Paper>
              ))}
            </List>

            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              {countdown !== null ? (
                <Typography variant="h5" color="success.main" fontWeight="bold">
                  Ouverture du chat dans {countdown}s...
                </Typography>
              ) : (
                <>
                  {!me?.ready ? (
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      onClick={onReady}
                    >
                      Je suis prêt à jouer
                    </Button>
                  ) : !me?.ready_for_chat ? (
                    <Button
                      variant="contained"
                      color="success"
                      size="large"
                      onClick={onReadyForChat}
                    >
                      Ouvrir le chat
                    </Button>
                  ) : (
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      fontWeight="bold"
                    >
                      En attente des autres joueurs...
                    </Typography>
                  )}
                </>
              )}
            </Box>
          </Box>
        ) : (
          /* ----- VUE RECHERCHE ----- */
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
              Recherche en cours...
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 450, lineHeight: 1.6 }}
            >
              Nous cherchons d'autres joueurs. Vous pouvez réduire cette
              fenêtre, nous vous avertirons dès qu'un groupe sera formé !
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
          Réduire en arrière-plan
        </Button>
        {(!party || party.status === 'open') && startedAt && (
          <Button
            onClick={onCancel}
            color="error"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          >
            {party ? 'Quitter le lobby' : 'Annuler la recherche'}
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
