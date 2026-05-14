import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import type { AdminUser } from '../../types/admin';

type Props = Readonly<{
  user: AdminUser | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (userId: number, reason: string) => void;
}>;

export default function SuspendUserModal({
  user,
  open,
  onClose,
  onConfirm,
}: Props) {
  const [reason, setReason] = useState('');

  function handleConfirm() {
    if (!user || !reason.trim()) return;
    onConfirm(user.id, reason.trim());
    setReason('');
    onClose();
  }

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Suspendre l'utilisateur</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Vous allez suspendre le compte de{' '}
          <strong>{user?.pseudo ?? user?.email}</strong>. Veuillez indiquer une
          raison.
        </DialogContentText>
        <TextField
          label="Raison de la suspension"
          fullWidth
          multiline
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={!reason.trim()}
        >
          Suspendre
        </Button>
      </DialogActions>
    </Dialog>
  );
}
