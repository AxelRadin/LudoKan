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
  readonly party: any | null;
  readonly partyActions: any;
}

// ----------------------------------------------------------------------
// SOUS-COMPOSANT : VUE DU CHAT (Se charge uniquement quand le chat est actif)
// ----------------------------------------------------------------------
function PartyChatView({
  party,
  onLeave,
}: {
  party: any;
  onLeave: () => void;
}) {
  const { messages, sendMessage, isConnected } = usePartyChat(
    party.chat_room_id
  );
  const [chatInput, setChatInput] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll en bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Logique d'auto-fermeture si on est seul (Règle des 30 secondes)
  const activeMembers = party.members.filter(
    (m: any) => m.membership_status === 'active' && !m.left_at
  );

  useEffect(() => {
    if (activeMembers.length <= 1) {
      if (timeLeft === null) setTimeLeft(30);
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 400 }}>
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
          p: 1,
          bgcolor: '#fff',
          borderRadius: 2,
          mb: 2,
          border: '1px solid #ddd',
        }}
      >
        {messages.length === 0 && (
          <Typography color="text.secondary" align="center" sx={{ mt: 2 }}>
            {isConnected
              ? 'Le chat est ouvert ! Dites bonjour.'
              : 'Connexion au chat...'}
          </Typography>
        )}
        {messages.map((msg, idx) => (
          <Box key={msg.id ?? idx} sx={{ mb: 1.5 }}>
            <Typography variant="caption" fontWeight="bold" color="primary">
              Joueur #{msg.user_id}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                bgcolor: 'grey.100',
                p: 1.5,
                borderRadius: 2,
                display: 'inline-block',
                mt: 0.5,
              }}
            >
              {msg.content}
            </Typography>
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Écrivez un message..."
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && chatInput.trim()) {
              sendMessage(chatInput);
              setChatInput('');
            }
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
      party.status
    );
  const isChatPhase = party && party.status === 'chat_active';

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
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {t('matchmakingModal.analyzing')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              En attente de joueurs à proximité...
            </Typography>
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
