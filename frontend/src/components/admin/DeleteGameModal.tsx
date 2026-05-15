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
  /** Si défini, remplace le titre par défaut « Supprimer le jeu ». */
  dialogTitle?: string;
  /** Si défini, remplace le texte d’avertissement par défaut (suppression jeu). */
  warningText?: string;
}>;

export default function DeleteGameModal({
  open,
  gameName,
  loading = false,
  onClose,
  onConfirm,
  dialogTitle = 'Supprimer le jeu',
  warningText,
}: Props) {
  const body =
    warningText ??
    `Confirmer la suppression définitive de « ${gameName} » ? Cette action est irréversible (avis, notes et données liées seront supprimés en cascade).`;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {body}
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
