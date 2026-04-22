import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { apiGet } from '../services/api';
import { PartyInfo, PartyMember } from './MatchmakingModal';

interface PartyChatModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onLeave: () => void;
  readonly party: PartyInfo | null;
  readonly game: { readonly name: string; readonly image: string } | null;
}

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  isSystem?: boolean;
}

export default function PartyChatModal({
  open,
  onClose,
  onLeave,
  party,
  game,
}: PartyChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [closingCountdown, setClosingCountdown] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMembersRef = useRef<PartyMember[]>(party?.members || []);

  const chatRoomId = party?.chat_room_id;
  const countdownEndsAt = party?.countdown_ends_at;
  const membersCount = party?.members?.length || 0;

  const membersStr = JSON.stringify(party?.members || []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!chatRoomId) return;

    const fetchHistory = async () => {
      try {
        const res = await apiGet(`/api/chats/${chatRoomId}/messages`);
        const historyList = Array.isArray(res) ? res : res?.results || [];

        const formattedHistory = historyList.map((msg: any) => ({
          id: msg.id.toString(),
          sender: `Joueur ${msg.user_id}`,
          content: msg.content,
        }));

        setMessages(formattedHistory);
      } catch (error) {
        console.error('Erreur chargement historique:', error);
      }
    };

    fetchHistory();
  }, [chatRoomId]);

  useEffect(() => {
    if (!chatRoomId) return;

    const apiBase =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const wsProtocol = apiBase.startsWith('https') ? 'wss://' : 'ws://';
    const wsHost = apiBase.replace(/^https?:\/\//, '');
    const wsUrl = `${wsProtocol}${wsHost}/ws/chat/${chatRoomId}/`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = event => {
      const data = JSON.parse(event.data);

      setMessages(prev => {
        const newId = data.id ? data.id.toString() : Date.now().toString();
        if (prev.some(m => m.id === newId)) return prev;

        return [
          ...prev,
          {
            id: newId,
            sender: `Joueur ${data.user_id}`,
            content: data.content,
          },
        ];
      });
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [chatRoomId]);

  useEffect(() => {
    const currentMembers: PartyMember[] = JSON.parse(membersStr);
    const previousMembers = prevMembersRef.current;

    if (currentMembers.length < previousMembers.length) {
      const remainingIds = currentMembers.map(m => m.id);
      const leftMembers = previousMembers.filter(
        m => !remainingIds.includes(m.id)
      );

      leftMembers.forEach(member => {
        const pseudo =
          (member.user as any).pseudo || member.user.username || 'Un joueur';

        setMessages(prev => [
          ...prev,
          {
            id: `sys-${Date.now()}-${member.id}`,
            sender: 'Système',
            content: `${pseudo} a quitté le salon.`,
            isSystem: true,
          },
        ]);
      });
    }
    prevMembersRef.current = currentMembers;
  }, [membersStr]);

  useEffect(() => {
    if (membersCount === 1 && countdownEndsAt) {
      const interval = setInterval(() => {
        const remaining = Math.floor(
          (new Date(countdownEndsAt).getTime() - Date.now()) / 1000
        );

        if (remaining <= 0) {
          clearInterval(interval);
          onLeave();
        } else {
          setClosingCountdown(remaining);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setClosingCountdown(null);
    }
  }, [membersCount, countdownEndsAt, onLeave]);

  const handleSend = () => {
    if (!input.trim() || !wsRef.current) return;

    wsRef.current.send(JSON.stringify({ type: 'message', content: input }));
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  if (!party) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: 'hidden',
          height: '75vh',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ChatBubbleOutlineIcon />
          <Box>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>
              Salon : {game?.name || 'Jeu'}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {membersCount} joueurs connectés
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={onLeave}
            sx={{ textTransform: 'none', fontWeight: 'bold' }}
          >
            Quitter
          </Button>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {closingCountdown !== null && (
        <Box
          sx={{
            bgcolor: 'error.main',
            color: 'white',
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          <WarningAmberIcon fontSize="small" />
          <Typography variant="body2" fontWeight="bold">
            Plus aucun joueur. Le salon se fermera dans {closingCountdown}{' '}
            secondes.
          </Typography>
        </Box>
      )}

      <DialogContent
        sx={{
          bgcolor: '#f8f9fa',
          flexGrow: 1,
          p: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ my: 2 }}
        >
          La discussion a commencé. Dites bonjour !
        </Typography>

        <Box sx={{ alignSelf: 'center', maxWidth: '80%', mb: 2 }}>
          <Box
            sx={{
              bgcolor: '#e0e0e0',
              color: 'black',
              px: 2,
              py: 1,
              borderRadius: 4,
            }}
          >
            <Typography variant="caption" fontWeight="bold">
              Bienvenue dans le salon {chatRoomId}
            </Typography>
          </Box>
        </Box>

        {messages.map(msg => {
          const isMe = msg.sender === 'Vous';

          if (msg.isSystem) {
            return (
              <Typography
                key={msg.id}
                variant="caption"
                color="text.secondary"
                textAlign="center"
                sx={{ fontStyle: 'italic', my: 1 }}
              >
                {msg.content}
              </Typography>
            );
          }

          return (
            <Box
              key={msg.id}
              sx={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
              }}
            >
              {!isMe && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {msg.sender}
                </Typography>
              )}
              <Box
                sx={{
                  bgcolor: isMe ? 'primary.main' : 'white',
                  color: isMe ? 'white' : 'black',
                  p: 1.5,
                  borderRadius: 2,
                  borderTopLeftRadius: isMe ? 8 : 0,
                  borderTopRightRadius: isMe ? 0 : 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <Typography variant="body2">{msg.content}</Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </DialogContent>

      <Box
        sx={{
          p: 2,
          bgcolor: 'white',
          borderTop: '1px solid #eee',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          placeholder="Écrivez votre message..."
          variant="outlined"
          size="small"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          disabled={closingCountdown !== null}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5 } }}
        />
        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || closingCountdown !== null}
          sx={{
            bgcolor: 'primary.light',
            color: 'primary.main',
            '&:hover': { bgcolor: 'primary.main', color: 'white' },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Dialog>
  );
}
