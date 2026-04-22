import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { PartyInfo } from './MatchmakingModal';

interface PartyChatModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly party: PartyInfo | null;
  readonly game: { readonly name: string; readonly image: string } | null;
}

export default function PartyChatModal({
  open,
  onClose,
  party,
  game,
}: PartyChatModalProps) {
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
          height: '70vh',
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
              {party.members.length} joueurs connectés
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

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

        <Box sx={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            Système
          </Typography>
          <Box
            sx={{
              bgcolor: '#e0e0e0',
              color: 'black',
              p: 1.5,
              borderRadius: 2,
              borderTopLeftRadius: 0,
            }}
          >
            <Typography variant="body2">
              Bienvenue dans le salon {party.chat_room_id}
            </Typography>
          </Box>
        </Box>
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
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5 } }}
        />
        <IconButton
          color="primary"
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
