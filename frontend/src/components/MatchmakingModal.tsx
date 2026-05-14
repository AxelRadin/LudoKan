import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import RadarIcon from '@mui/icons-material/Radar';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { keyframes } from '@mui/system';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/useAuth';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import { usePartyChat } from '../hooks/usePartyChat';
import { type Party } from '../services/party';

const pulseRadar = keyframes`
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
`;

// Hook pour obtenir les couleurs dynamiques basées sur le thème
function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(() => {
    const common = {
      accent: '#FF3D3D',
      isDark,
    };

    if (isDark) {
      return {
        ...common,
        dialogBg: '#2a2020',
        cardBg: 'rgba(42,32,32,0.78)',
        chatBg: 'rgba(32,24,24,0.6)',
        border: 'rgba(74,48,48,0.6)',
        borderTop: 'rgba(74,48,48,0.5)',
        title: '#f5e6e6',
        text: '#e0d0d0',
        textSecondary: '#9e7070',
        inputBg: 'rgba(32,24,24,0.82)',
        inputBorder: 'rgba(74,48,48,0.6)',
        messageBg: 'rgba(42,32,32,0.9)',
        myMessageBg: '#FF3D3D',
      };
    }

    return {
      ...common,
      dialogBg: '#f8f9fa',
      cardBg: '#fff',
      chatBg: '#f5f6f8',
      border: '#e0e0e0',
      borderTop: '#eee',
      title: '#111',
      text: '#2b2b2b',
      textSecondary: '#666',
      inputBg: '#fff',
      inputBorder: 'rgba(0,0,0,0.23)',
      messageBg: 'grey.100',
      myMessageBg: 'primary.main',
    };
  }, [isDark]);
}

interface MatchmakingModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onCancel: () => void;
  readonly startedAt: Date | null;
  readonly game: {
    readonly id?: string;
    readonly name: string;
    readonly image: string;
  } | null;
  readonly party?: Party | null;
  readonly isExpanding: boolean;
  readonly currentRadius: number;
  readonly partyActions: {
    readonly markReady: (val: boolean) => Promise<void>;
    readonly markReadyForChat: (val: boolean) => Promise<void>;
    readonly markStartEarly: (val: boolean) => Promise<void>;
    readonly leave: () => Promise<void>;
  };
}

interface PartyChatViewProps {
  readonly party: Party;
  readonly onLeave: () => void;
  readonly currentUserId?: number;
}

function PartyChatView({ party, onLeave, currentUserId }: PartyChatViewProps) {
  const C = useThemeColors();
  const { messages, sendMessage, isConnected } = usePartyChat(
    party.chat_room_id
  );
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeMembers = party.members.filter(
    (m: any) => m.membership_status === 'active' && !m.left_at
  );

  useEffect(() => {
    if (activeMembers.length <= 1) {
      setTimeLeft(prev => (prev === null ? 30 : prev));
    } else {
      setTimeLeft(null);
    }
  }, [activeMembers.length]);

  useEffect(() => {
    if (timeLeft === null) return;
    if (timeLeft <= 0) {
      onLeave();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, onLeave]);

  const getMemberInfo = (userId: number) => {
    return party.members.find((m: any) => m.user_id === userId);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 450 }}>
      {timeLeft !== null && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Il n'y a plus personne avec vous. Le salon se fermera dans {timeLeft}{' '}
          secondes.
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: C.chatBg,
          backdropFilter: 'blur(10px)',
          borderRadius: 2,
          mb: 2,
          border: `1px solid ${C.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
            {isConnected
              ? 'Le chat est ouvert ! Dites bonjour.'
              : 'Connexion au chat...'}
          </Typography>
        )}

        {messages.map((msg, idx) => {
          const isMe = msg.user_id === currentUserId;
          const member = getMemberInfo(msg.user_id);
          const pseudo = member?.pseudo || `Joueur #${msg.user_id}`;
          const avatarUrl = member?.avatar_url || undefined;

          const rawDate = msg.created_at || msg.timestamp;
          const messageDate = rawDate ? new Date(rawDate) : new Date();

          return (
            <Box
              key={msg.id ?? idx}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                flexDirection: isMe ? 'row-reverse' : 'row',
                '&:hover .profile-btn': { opacity: 1, visibility: 'visible' },
              }}
            >
              <Avatar
                src={avatarUrl}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: isMe ? 'secondary.main' : 'primary.main',
                }}
              >
                {pseudo.charAt(0).toUpperCase()}
              </Avatar>

              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 1,
                    flexDirection: isMe ? 'row-reverse' : 'row',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    color={isMe ? 'secondary.main' : 'primary.main'}
                  >
                    {pseudo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {messageDate.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>

                <Typography
                  variant="body2"
                  sx={{
                    bgcolor: isMe ? C.myMessageBg : C.messageBg,
                    color: isMe ? '#fff' : C.text,
                    p: 1.5,
                    borderRadius: 2,
                    borderTopRightRadius: isMe ? 0 : 8,
                    borderTopLeftRadius: isMe ? 8 : 0,
                    display: 'inline-block',
                    mt: 0.5,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  {msg.content}
                </Typography>
              </Box>

              {!isMe && (
                <Button
                  className="profile-btn"
                  variant="outlined"
                  size="small"
                  onClick={() =>
                    window.open(`/profile/${msg.user_id}`, '_blank')
                  }
                  sx={{
                    opacity: 0,
                    visibility: 'hidden',
                    transition: '0.2s',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    mt: 3,
                  }}
                >
                  Voir le profil
                </Button>
              )}
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Écrivez un message dans le salon..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && chatInput.trim()) {
              sendMessage(chatInput);
              setChatInput('');
            }
          }}
          sx={{
            bgcolor: C.inputBg,
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              color: C.text,
              '& fieldset': {
                borderColor: C.inputBorder,
              },
            },
            '& .MuiInputBase-input::placeholder': {
              color: C.textSecondary,
              opacity: 0.7,
            },
          }}
        />
        <Button
          variant="contained"
          disabled={!chatInput.trim() || !isConnected}
          onClick={() => {
            sendMessage(chatInput);
            setChatInput('');
          }}
        >
          <SendIcon fontSize="small" />
        </Button>
      </Box>
    </Box>
  );
}

function getMemberStatusText(member: any, status: string) {
  if (member.wants_to_start_early && status === 'open') return 'Prêt à lancer';
  if (status === 'waiting_ready') return `Statut : ${member.ready_state}`;
  if (status === 'waiting_ready_for_chat')
    return `Chat : ${member.ready_for_chat_state}`;
  return '';
}

function getMemberStatusColor(member: any) {
  if (member.wants_to_start_early || member.ready_state === 'accepted')
    return 'success.main';
  return 'text.secondary';
}

export default function MatchmakingModal({
  open,
  onClose,
  onCancel,
  startedAt,
  game,
  party,
  isExpanding,
  currentRadius,
  partyActions,
}: MatchmakingModalProps) {
  const { t } = useTranslation();
  const elapsedTime = useMatchmakingTimer(startedAt);
  const { user } = useAuth();
  const C = useThemeColors();

  const activeMembers = party?.members?.filter((m: any) => !m.left_at) || [];

  const currentUserMember = activeMembers.find(
    (m: any) => m.user_id === user?.id
  );
  const hasVotedEarly = currentUserMember?.wants_to_start_early;

  const isRadarPhase = !party;
  const isLobbyPhase =
    party &&
    ['open', 'waiting_ready', 'waiting_ready_for_chat', 'countdown'].includes(
      party?.status ?? ''
    );
  const isChatPhase = party?.status === 'chat_active';

  const renderRadiusMessage = () => {
    if (currentRadius >= 10000) {
      return (
        <Typography
          variant="caption"
          color="secondary"
          sx={{ fontWeight: 'bold' }}
        >
          Recherche mondiale activée...
        </Typography>
      );
    }
    if (isExpanding) {
      return (
        <Typography
          variant="caption"
          color="primary"
          sx={{ fontStyle: 'italic' }}
        >
          Élargissement de la zone de recherche ({currentRadius} km)...
        </Typography>
      );
    }
    return (
      <Typography variant="caption" sx={{ color: C.textSecondary }}>
        Rayon actuel : {currentRadius} km
      </Typography>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          maxWidth: 650,
          bgcolor: C.dialogBg,
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          height: 120,
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
          {startedAt && isRadarPhase && (
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

      <DialogContent sx={{ bgcolor: C.dialogBg, p: 3 }}>
        {isRadarPhase && (
          <Box
            sx={{
              py: 6,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Avatar
              sx={{
                width: 100,
                height: 100,
                bgcolor: 'primary.main',
                animation: `${pulseRadar} 2s infinite`,
              }}
            >
              <RadarIcon sx={{ fontSize: 48 }} />
            </Avatar>

            <Typography variant="h6" sx={{ mt: 3, color: C.title }}>
              {t('matchmakingModal.analyzing')}
            </Typography>
            <Box sx={{ height: 24, mt: 1 }}>{renderRadiusMessage()}</Box>
          </Box>
        )}

        {isLobbyPhase && (
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              textAlign="center"
              sx={{ color: C.title }}
            >
              {party.status === 'open'
                ? 'Formation du groupe...'
                : 'Préparation de la partie'}
            </Typography>

            <Typography
              variant="subtitle2"
              textAlign="center"
              sx={{ mb: 2, fontWeight: 'bold', color: C.textSecondary }}
            >
              Joueurs : {activeMembers.length} / {party.max_players}
            </Typography>

            <List>
              {activeMembers.map((member: any) => (
                <Paper
                  key={member.user_id}
                  elevation={1}
                  sx={{
                    mb: 1,
                    borderRadius: 2,
                    bgcolor: C.cardBg,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={member.pseudo || `Joueur #${member.user_id}`}
                      secondary={getMemberStatusText(member, party.status)}
                      primaryTypographyProps={{ color: C.title }}
                      secondaryTypographyProps={{
                        color: getMemberStatusColor(member),
                      }}
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
              {party.status === 'open' && (
                <Button
                  variant="contained"
                  color={hasVotedEarly ? 'inherit' : 'primary'}
                  disabled={hasVotedEarly}
                  onClick={() => partyActions.markStartEarly(true)}
                >
                  {hasVotedEarly
                    ? 'En attente des autres...'
                    : 'Lancer tout de suite'}
                </Button>
              )}
              {party.status === 'waiting_ready' && (
                <Button
                  variant="contained"
                  color="success"
                  onClick={() => partyActions.markReady(true)}
                >
                  Je suis prêt
                </Button>
              )}
              {party.status === 'waiting_ready_for_chat' && (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => partyActions.markReadyForChat(true)}
                >
                  Ouvrir le chat
                </Button>
              )}
              {party.status === 'countdown' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={24} />
                  <Typography fontWeight="bold" sx={{ color: C.title }}>
                    Ouverture du chat imminente...
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* PHASE 3 : CHAT ACTIF */}
        {isChatPhase && (
          <PartyChatView
            party={party}
            onLeave={onCancel}
            currentUserId={user?.id}
          />
        )}
      </DialogContent>

      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          bgcolor: C.dialogBg,
          borderTop: `1px solid ${C.borderTop}`,
        }}
      >
        <Button
          onClick={onClose}
          sx={{ fontWeight: 600, color: C.textSecondary }}
        >
          Réduire la fenêtre
        </Button>
        <Button
          onClick={onCancel}
          color="error"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        >
          Quitter la recherche / le groupe
        </Button>
      </Box>
    </Dialog>
  );
}
