import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { UserGame } from '../api/userGames';
import ConfirmModal from './ConfirmModal';

interface LibraryGameCardProps {
  readonly userGame: UserGame;
  readonly onRemove: (userGameId: number) => void;
}

export default function LibraryGameCard({
  userGame,
  onRemove,
}: LibraryGameCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleConfirm = () => {
    setModalOpen(false);
    onRemove(userGame.id);
  };

  return (
    <>
      <Card
        sx={{
          position: 'relative',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ pb: 5 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            Jeu #{userGame.game?.id ?? userGame.igdb_game_id ?? userGame.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Statut : {userGame.status}
          </Typography>
          {userGame.hours_played != null && (
            <Typography variant="body2" color="text.secondary">
              Heures jouées : {userGame.hours_played}
            </Typography>
          )}
        </CardContent>

        <Tooltip title="Retirer de la ludothèque">
          <IconButton
            size="small"
            onClick={() => setModalOpen(true)}
            sx={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              color: 'text.secondary',
              '&:hover': {
                color: 'error.main',
                bgcolor: 'error.light',
              },
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Card>

      <ConfirmModal
        open={modalOpen}
        title="Confirmer la suppression"
        message="Voulez-vous vraiment retirer ce jeu de votre ludothèque ?"
        confirmLabel="Retirer"
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}
