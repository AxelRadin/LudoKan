import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

type Props = Readonly<{
  open: boolean;
  gameName: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}>;

export default function DeleteGameModal({
  open,
  gameName,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Supprimer le jeu</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Confirmer la suppression définitive de « {gameName} » ? Cette action
          est irréversible (avis, notes et données liées seront supprimés en
          cascade).
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={loading}
        >
          Supprimer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
