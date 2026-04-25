import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import { useSubmitReview } from '../hooks/useSubmitReview';

type ReviewFormValues = {
  content: string;
};

type ReviewFormProps = Readonly<{
  gameId: string;
  onSuccess?: (review: { id: number; content: string }) => void;
}>;

export default function ReviewForm({ gameId, onSuccess }: ReviewFormProps) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { loading, success, error, submitReview } = useSubmitReview();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<ReviewFormValues>({
    mode: 'onChange',
    defaultValues: { content: '' },
  });

  const content = watch('content') ?? '';

  useEffect(() => {
    if (success) reset({ content: '' });
  }, [success, reset]);

  async function onSubmit(data: ReviewFormValues) {
    const result = await submitReview(gameId, data.content);
    if (result && onSuccess)
      onSuccess(result as { id: number; content: string });
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          p: 2,
          bgcolor: '#f5f6fa',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
          mt: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {t('reviewForm.loginPrompt')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        width: '100%',
        bgcolor: '#f5f6fa',
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        p: 3,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        {t('reviewForm.title')}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <TextField
        multiline
        rows={5}
        fullWidth
        placeholder={t('reviewForm.placeholder')}
        {...register('content', {
          required: t('reviewForm.errorRequired'),
          minLength: { value: 10, message: t('reviewForm.errorMinLength') },
          maxLength: { value: 500, message: t('reviewForm.errorMaxLength') },
        })}
        error={!!errors.content}
        helperText={errors.content?.message}
        disabled={loading}
        sx={{
          '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1.5,
        }}
      >
        <Typography
          variant="caption"
          color={content.length > 500 ? 'error' : 'text.secondary'}
        >
          {t('reviewForm.counter', { count: content.length })}
        </Typography>
        <Button
          type="submit"
          variant="contained"
          disabled={!isValid || loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          {loading ? t('reviewForm.submitting') : t('reviewForm.submit')}
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
          {t('reviewForm.success')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
