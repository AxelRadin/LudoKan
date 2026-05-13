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
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import { usePartyChat } from '../hooks/usePartyChat';
import { type Party } from '../services/party';

const pulseRadar = keyframes`
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(2.5); opacity: 0; }
`;

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
  readonly partyActions: any;
}

interface PartyChatViewProps {
  readonly party: Party;
  readonly onLeave: () => void;
}
function PartyChatView({ party, onLeave }: PartyChatViewProps) {
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
          Il n'y a plus personne avec vous. Le salon se fermera dans {timeLeft} secondes.
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: '#f5f6f8',
          borderRadius: 2,
          mb: 2,
          border: '1px solid #e0e0e0',
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
          const member = getMemberInfo(msg.user_id);
          const pseudo = member?.pseudo || `Joueur #${msg.user_id}`;
          const avatarUrl = member?.avatar_url || undefined;

          return (
            <Box
              key={msg.id ?? idx}
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'flex-start',
                '&:hover .profile-btn': { opacity: 1, visibility: 'visible' }
              }}
            >
              <Avatar src={avatarUrl} sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                {pseudo.charAt(0).toUpperCase()}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                    {pseudo}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5, color: 'text.primary', wordBreak: 'break-word' }}>
                  {msg.content}
                </Typography>
              </Box>

              <Button
                className="profile-btn"
                variant="outlined"
                size="small"
                onClick={() => window.open(`/profile/${msg.user_id}`, '_blank')}
                sx={{
                  opacity: 0,
                  visibility: 'hidden',
                  transition: '0.2s',
                  textTransform: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                Voir le profil
              </Button>
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
          sx={{ bgcolor: '#fff', borderRadius: 1 }}
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

// ----------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ----------------------------------------------------------------------
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 4, overflow: 'hidden', maxWidth: 650 },
      }}
    >
      {/* HEADER (Bannière du Jeu) */}
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

      {/* CONTENU PRINCIPAL */}
      <DialogContent sx={{ bgcolor: '#f8f9fa', p: 3 }}>
        {/* PHASE 1 : RADAR */}
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

            <Typography variant="h6" sx={{ mt: 3 }}>
              {t('matchmakingModal.analyzing')}
            </Typography>

            {/* NOUVEAU MESSAGE D'ÉLARGISSEMENT */}
            <Box sx={{ height: 24, mt: 1 }}>
              {currentRadius >= 10000 ? (
                <Typography
                  variant="caption"
                  color="secondary"
                  sx={{ fontWeight: 'bold' }}
                >
                  Recherche mondiale activée...
                </Typography>
              ) : isExpanding ? (
                <Typography
                  variant="caption"
                  color="primary"
                  sx={{ fontStyle: 'italic' }}
                >
                  Élargissement de la zone de recherche ({currentRadius} km)...
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Rayon actuel : {currentRadius} km
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* PHASE 2 : LOBBY (Recrutement & Validation) */}
        {isLobbyPhase && (
          <Box>
            <Typography
              variant="h6"
              fontWeight="bold"
              gutterBottom
              textAlign="center"
            >
              {party.status === 'open'
                ? 'Formation du groupe...'
                : 'Préparation de la partie'}
            </Typography>

            <Typography
              variant="subtitle2"
              color="text.secondary"
              textAlign="center"
              sx={{ mb: 2, fontWeight: 'bold' }}
            >
              Joueurs : {activeMembers.length} / {party.max_players}
            </Typography>

            <List>
              {activeMembers.map((member: any) => (
                <Paper
                  key={member.user_id}
                  elevation={1}
                  sx={{ mb: 1, borderRadius: 2 }}
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
                      secondaryTypographyProps={{
                        color: getMemberStatusColor(member),
                      }}
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>

            {/* Actions dynamiques selon le statut de la party */}
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
                  <Typography fontWeight="bold">
                    Ouverture du chat imminente...
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* PHASE 3 : CHAT ACTIF */}
        {isChatPhase && <PartyChatView party={party} onLeave={onCancel} />}
      </DialogContent>

      {/* FOOTER (Actions globales) */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          bgcolor: '#f8f9fa',
          borderTop: '1px solid #eee',
        }}
      >
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
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
