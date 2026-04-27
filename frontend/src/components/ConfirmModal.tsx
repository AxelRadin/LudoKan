import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { t } from 'i18next';

interface ConfirmModalProps {
  readonly open: boolean;
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = t('common.confirm'),
  cancelLabel = t('common.cancel'),
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-description"
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle id="confirm-modal-title" sx={{ fontWeight: 'bold' }}>
        {title}
      </DialogTitle>

      <DialogContent>
        <DialogContentText id="confirm-modal-description">
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
        <Button onClick={onCancel} color="inherit" sx={{ fontWeight: 600 }}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color="error"
          variant="contained"
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
