import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  fetchLibraryPrivacy,
  patchLibraryPrivacy,
  type LibraryPrivacy,
} from '../api/libraryPrivacy';

const FONT_BODY = "'DM Sans', system-ui, sans-serif";

export type LibraryPrivacyModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}>;

export default function LibraryPrivacyModal({
  open,
  onClose,
  onSaved,
}: LibraryPrivacyModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<LibraryPrivacy | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchLibraryPrivacy();
      setDraft(data);
    } catch {
      setLoadError(t('libraryPrivacy.loadError'));
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      load().catch(() => {});
    }
  }, [open, load]);

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      await patchLibraryPrivacy({
        is_visible_on_profile: draft.is_visible_on_profile,
        is_visible_to_friends: draft.is_visible_to_friends,
      });
      await onSaved();
      onClose();
    } catch {
      setLoadError(t('libraryPrivacy.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: 18 }}
      >
        {t('libraryPrivacy.title')}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        ) : loadError && !draft ? (
          <Typography sx={{ fontFamily: FONT_BODY, color: 'error.main' }}>
            {loadError}
          </Typography>
        ) : draft ? (
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0.5 }}
          >
            {loadError ? (
              <Typography
                sx={{
                  fontFamily: FONT_BODY,
                  color: 'error.main',
                  fontSize: 14,
                }}
              >
                {loadError}
              </Typography>
            ) : null}
            <FormControlLabel
              control={
                <Switch
                  checked={draft.is_visible_to_friends}
                  onChange={(_, v) =>
                    setDraft(prev =>
                      prev ? { ...prev, is_visible_to_friends: v } : prev
                    )
                  }
                  disabled={saving}
                />
              }
              label={
                <Typography sx={{ fontFamily: FONT_BODY, fontSize: 15 }}>
                  {t('libraryPrivacy.shareWithFriends')}
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.is_visible_on_profile}
                  onChange={(_, v) =>
                    setDraft(prev =>
                      prev ? { ...prev, is_visible_on_profile: v } : prev
                    )
                  }
                  disabled={saving}
                />
              }
              label={
                <Typography sx={{ fontFamily: FONT_BODY, fontSize: 15 }}>
                  {t('libraryPrivacy.showOnPublicProfile')}
                </Typography>
              }
            />
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          disabled={saving}
          sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
        >
          {t('profilePage.cancel')}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || loading || !draft}
          sx={{ fontFamily: FONT_BODY, borderRadius: 2 }}
        >
          {saving ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            t('profilePage.save')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
