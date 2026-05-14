import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@mui/material/styles';

// Hook pour obtenir les couleurs dynamiques basées sur le thème
function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(
    () => ({
      dialogBg: isDark ? 'rgba(42,32,32,0.96)' : '#fff',
      glassBorder: isDark ? 'rgba(74,48,48,0.9)' : 'transparent',
      title: isDark ? '#f5e6e6' : '#111',
      text: isDark ? '#e0d0d0' : '#2b2b2b',
      muted: isDark ? '#9e7070' : '#6e6e73',
      isDark,
    }),
    [isDark]
  );
}

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
  const C = useThemeColors();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          zIndex: 10000,
          bgcolor: C.dialogBg,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${C.glassBorder}`,
        },
      }}
    >
      <DialogTitle
        id="confirm-dialog-title"
        sx={{
          fontWeight: 'bold',
          color: C.title,
        }}
      >
        {t('confirmCancelMatchmaking.title')}
      </DialogTitle>

      <DialogContent>
        <DialogContentText
          id="confirm-dialog-description"
          sx={{ color: C.text }}
        >
          {t('confirmCancelMatchmaking.description')}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
        <Button
          onClick={onClose}
          sx={{
            fontWeight: 600,
            color: C.muted,
            '&:hover': {
              backgroundColor: C.isDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
            },
          }}
        >
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
