import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ConfirmCancelMatchmakingModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

export default function ConfirmCancelMatchmakingModal({
  open,
  onClose,
  onConfirm,
}: ConfirmCancelMatchmakingModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        sx: { borderRadius: 3, p: 1, zIndex: 10000 },
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 'bold' }}>
        {t('confirmCancelMatchmaking.title')}
      </DialogTitle>

      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {t('confirmCancelMatchmaking.description')}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          {t('confirmCancelMatchmaking.keep')}
        </Button>
        <Button
          onClick={onConfirm}
          color="primary"
          variant="contained"
          sx={{ fontWeight: 600, borderRadius: 2 }}
        >
          {t('confirmCancelMatchmaking.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
