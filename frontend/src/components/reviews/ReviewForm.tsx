import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/useAuth';
import { useSubmitReview } from '../../hooks/useSubmitReview';

const RATING_LABELS: Record<number, string> = {
  1: 'Mauvais',
  2: 'Médiocre',
  3: 'Correct',
  4: 'Bon',
  5: 'Excellent',
};

type ReviewFormValues = {
  title: string;
  content: string;
  rating: number;
};

type ReviewFormProps = Readonly<{
  gameId: string;
  initialValues?: Partial<ReviewFormValues> & { id?: number };
  onSuccess?: (review: { id: number; title?: string; content: string }) => void;
  onCancel?: () => void;
}>;

function submitLabel(loading: boolean, existingId?: number): string {
  if (loading) return 'Envoi...';
  return existingId ? 'Mettre à jour' : 'Publier mon avis';
}

export default function ReviewForm({
  gameId,
  initialValues,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { isAuthenticated } = useAuth();
  const { loading, success, error, submitReview } = useSubmitReview();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isValid },
  } = useForm<ReviewFormValues>({
    mode: 'onChange',
    defaultValues: {
      title: initialValues?.title || '',
      content: initialValues?.content || '',
      rating: initialValues?.rating || 0,
    },
  });

  const title = watch('title') ?? '';
  const content = watch('content') ?? '';
  const rating = watch('rating') ?? 0;

  useEffect(() => {
    if (success && !initialValues?.id) {
      reset({ title: '', content: '', rating: 0 });
    }
  }, [success, reset, initialValues?.id]);

  async function onSubmit(data: ReviewFormValues) {
    const result = await submitReview(
      gameId,
      data.content,
      initialValues?.id,
      data.title,
      data.rating
    );
    if (result && onSuccess) {
      onSuccess(result as { id: number; title?: string; content: string });
    }
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          p: 2,
          bgcolor: '#f5f6fa',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {'Connectez-vous pour écrire un avis.'}
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
        {initialValues?.id ? 'Modifier mon avis' : 'Donner votre avis'}
      </Typography>
      <Divider sx={{ mb: 2 }} />

      {/* Étoiles */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
          Note
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Rating
            value={rating}
            onChange={(_, value) =>
              setValue('rating', value ?? 0, { shouldValidate: true })
            }
          />
          {rating > 0 && (
            <Typography variant="body2" color="text.secondary">
              {RATING_LABELS[rating]}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Titre */}
      <TextField
        label="Titre de l'avis"
        fullWidth
        size="small"
        {...register('title', {
          required: 'Le titre est obligatoire.',
          maxLength: {
            value: 25,
            message: 'Le titre ne peut pas dépasser 25 caractères.',
          },
        })}
        error={!!errors.title}
        helperText={errors.title?.message}
        disabled={loading}
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 2 },
        }}
      />
      <Typography
        variant="caption"
        color={title.length > 25 ? 'error' : 'text.secondary'}
        sx={{ mb: 2, display: 'block' }}
      >
        {title.length} / 25
      </Typography>

      {/* Contenu */}
      <TextField
        label="Votre avis"
        multiline
        rows={4}
        fullWidth
        placeholder="Qu'avez-vous pensé de ce jeu ?"
        {...register('content', {
          required: "L'avis est obligatoire.",
          minLength: {
            value: 10,
            message: "L'avis doit contenir au moins 10 caractères.",
          },
          maxLength: {
            value: 125,
            message: "L'avis ne peut pas dépasser 125 caractères.",
          },
        })}
        error={!!errors.content}
        helperText={errors.content?.message}
        disabled={loading}
        sx={{
          mb: 1,
          '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 2 },
        }}
      />
      <Typography
        variant="caption"
        color={content.length > 125 ? 'error' : 'text.secondary'}
        sx={{ mb: 2, display: 'block' }}
      >
        {content.length} / 125
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {onCancel && (
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={!isValid || loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{
            bgcolor: 'success.light',
            '&:hover': { bgcolor: 'success.main' },
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          {submitLabel(loading, initialValues?.id)}
        </Button>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
          {initialValues?.id
            ? 'Avis mis à jour !'
            : 'Avis publié avec succès !'}
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
