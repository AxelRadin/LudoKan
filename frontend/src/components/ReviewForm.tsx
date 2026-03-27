import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSubmitReview } from '../hooks/useSubmitReview';
import { useAuth } from '../contexts/useAuth';

type ReviewFormValues = {
  content: string;
};

type ReviewFormProps = {
  gameId: string;
  existingReviewId?: number;
  existingContent?: string;
  onSuccess?: (review: { id: number; content: string }) => void;
};

export default function ReviewForm({
  gameId,
  existingReviewId,
  existingContent,
  onSuccess,
}: ReviewFormProps) {
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
    defaultValues: { content: existingContent || '' },
  });

  const content = watch('content') ?? '';

  useEffect(() => {
    if (success) {
      reset({ content: '' });
    }
  }, [success, reset]);

  async function onSubmit(data: ReviewFormValues) {
    const result = await submitReview(gameId, data.content, existingReviewId);
    if (result && onSuccess) {
      onSuccess(result as { id: number; content: string });
    }
  }

  if (!isAuthenticated) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Connectez-vous pour écrire un avis.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      <TextField
        multiline
        rows={4}
        fullWidth
        placeholder="Partagez votre avis sur ce jeu..."
        {...register('content', {
          required: "L'avis est obligatoire.",
          minLength: {
            value: 10,
            message: "L'avis doit contenir au moins 10 caractères.",
          },
          maxLength: {
            value: 500,
            message: "L'avis ne peut pas dépasser 500 caractères.",
          },
        })}
        error={!!errors.content}
        helperText={errors.content?.message}
        disabled={loading}
      />

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Typography
          variant="caption"
          color={content.length > 500 ? 'error' : 'text.secondary'}
        >
          {content.length} / 500
        </Typography>

        <Button
          type="submit"
          variant="contained"
          disabled={!isValid || loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Envoi...' : 'Envoyer'}
        </Button>
      </Box>

      {success && (
        <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
          Avis publié !
        </Typography>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}
