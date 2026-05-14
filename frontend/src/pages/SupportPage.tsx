import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLayout } from '../components/PageLayout';
import { useAuth } from '../contexts/useAuth';
import { apiGet, apiPost } from '../services/api';

type SupportRow = {
  id: number;
  category: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const CATEGORY_KEYS: Record<string, string> = {
  bug: 'supportPage.categoryBug',
  account: 'supportPage.categoryAccount',
  other: 'supportPage.categoryOther',
};

export default function SupportPage() {
  const { t } = useTranslation();
  const { isAuthenticated, isAuthLoading } = useAuth();
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/api/support/tickets/');
      const list = Array.isArray(data) ? data : (data.results ?? []);
      setRows(list as SupportRow[]);
    } catch {
      setSnackbar({ message: t('supportPage.loadError'), severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
  }, [isAuthenticated, load]);

  if (isAuthLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiPost('/api/support/tickets/', {
        category,
        subject: subject.trim(),
        body: body.trim(),
        page_url: pageUrl.trim() || undefined,
      });
      setSubject('');
      setBody('');
      setPageUrl('');
      setSnackbar({ message: t('supportPage.sentOk'), severity: 'success' });
      await load();
    } catch {
      setSnackbar({ message: t('supportPage.sentError'), severity: 'error' });
    }
  }

  return (
    <PageLayout title={t('supportPage.title')} backTo="/settings">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('supportPage.intro')}
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          maxWidth: 640,
        }}
      >
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="support-cat">{t('supportPage.category')}</InputLabel>
          <Select
            labelId="support-cat"
            label={t('supportPage.category')}
            value={category}
            onChange={e => setCategory(String(e.target.value))}
          >
            <MenuItem value="bug">{t('supportPage.categoryBug')}</MenuItem>
            <MenuItem value="account">
              {t('supportPage.categoryAccount')}
            </MenuItem>
            <MenuItem value="other">{t('supportPage.categoryOther')}</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          required
          size="small"
          label={t('supportPage.subject')}
          value={subject}
          onChange={e => setSubject(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          required
          multiline
          minRows={4}
          label={t('supportPage.message')}
          value={body}
          onChange={e => setBody(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          label={t('supportPage.pageUrl')}
          value={pageUrl}
          onChange={e => setPageUrl(e.target.value)}
          placeholder="https://..."
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={subject.trim().length < 3 || body.trim().length < 10}
        >
          {t('supportPage.submit')}
        </Button>
      </Box>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {t('supportPage.history')}
      </Typography>
      {loading ? (
        <Typography variant="body2">{t('supportPage.loading')}</Typography>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t('supportPage.empty')}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {rows.map(row => (
            <Box
              key={row.id}
              sx={{
                p: 2,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="subtitle2" fontWeight={600}>
                #{row.id} — {row.subject}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {t(CATEGORY_KEYS[row.category] ?? 'supportPage.categoryOther')}{' '}
                · {row.status} · {new Date(row.created_at).toLocaleString()}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      <Snackbar
        open={!!snackbar}
        autoHideDuration={5000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar?.severity} onClose={() => setSnackbar(null)}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </PageLayout>
  );
}
