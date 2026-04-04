import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
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

const TITLE_MAX = 25;
const CONTENT_MAX = 125;

// ─── StarIcon ─────────────────────────────────────────────────────────────────

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <path
      d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32L2.27 7.12l5.34-.78z"
      fill={filled ? 'rgb(255, 180, 180)' : 'none'}
      stroke={filled ? 'none' : '#C0C0C0'}
      strokeWidth={filled ? 0 : 1.2}
    />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewFormValues = {
  title: string;
  content: string;
  rating: number;
};

type ReviewFormProps = Readonly<{
  gameId: string;
  resolveGameId?: () => Promise<string | number | null>;
  initialValues?: Partial<ReviewFormValues> & { id?: number };
  onSuccess?: (review: { id: number; title?: string; content: string }) => void;
  onCancel?: () => void;
}>;

function submitLabel(loading: boolean, existingId?: number): string {
  if (loading) return 'Envoi...';
  return existingId ? 'Mettre à jour' : 'Publier';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ReviewForm({
  gameId,
  resolveGameId,
  initialValues,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { isAuthenticated } = useAuth();
  const { loading, success, error, submitReview } = useSubmitReview();
  const [showTextFields, setShowTextFields] = useState(
    !!(initialValues?.id || initialValues?.title || initialValues?.content)
  );
  const [hoveredRating, setHoveredRating] = useState<number>(0);

  useEffect(() => {
    if (initialValues?.id) {
      setShowTextFields(true);
    }
  }, [initialValues?.id]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
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

  const canSubmit = rating > 0 || content.length > 0;

  const displayRating = hoveredRating || rating;

  useEffect(() => {
    if (success && !initialValues?.id) {
      reset({ title: '', content: '', rating: 0 });
      setShowTextFields(false);
    }
  }, [success, reset, initialValues?.id]);

  useEffect(() => {
    reset({
      title: initialValues?.title || '',
      content: initialValues?.content || '',
      rating: initialValues?.rating || 0,
    });
  }, [
    initialValues?.id,
    initialValues?.title,
    initialValues?.content,
    initialValues?.rating,
    reset,
  ]);

  async function onSubmit(data: ReviewFormValues) {
    const resolvedGameId = resolveGameId ? await resolveGameId() : gameId;
    if (!resolvedGameId) return;
    const result = await submitReview(
      String(resolvedGameId),
      data.content,
      initialValues?.id,
      data.title || undefined,
      data.rating || undefined
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
          bgcolor: '#fff',
          borderRadius: 3,
          border: '1px solid rgb(255, 211, 211)',
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
        bgcolor: '#fff',
        border: '1px solid rgb(255, 211, 211)',
        borderRadius: 3,
        overflow: 'hidden',
        '@keyframes pulseGlow': {
          '0%, 100%': {
            boxShadow:
              '0 0 5px 1px rgba(255,211,211,0.35), 0 0 12px 3px rgba(255,150,150,0.1)',
          },
          '50%': {
            boxShadow:
              '0 0 9px 3px rgba(255,211,211,0.6), 0 0 22px 6px rgba(255,100,100,0.18)',
          },
        },
        animation: 'pulseGlow 3s ease-in-out infinite',
      }}
    >
      <Box sx={{ p: '1.5rem' }}>
        {/* Titre */}
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, fontSize: 15, textAlign: 'center', mb: 2 }}
        >
          {initialValues?.id ? 'Modifier mon avis' : 'Donner votre avis'}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Label Note */}
        <Typography
          variant="caption"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#aaa',
            display: 'block',
            mb: '6px',
          }}
        >
          Note
        </Typography>

        {/* Étoiles */}
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: '4px', mb: '6px' }}
        >
          {Array.from({ length: 5 }, (_, i) => i + 1).map(n => (
            <Box
              key={n}
              component="span"
              onClick={() => setValue('rating', n, { shouldValidate: true })}
              onMouseEnter={() => setHoveredRating(n)}
              onMouseLeave={() => setHoveredRating(0)}
              sx={{
                cursor: 'pointer',
                display: 'inline-flex',
                lineHeight: 0,
                userSelect: 'none',
              }}
            >
              <StarIcon filled={n <= displayRating} />
            </Box>
          ))}
        </Box>

        {/* Badge score + label */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2,
            minHeight: 22,
            visibility: rating > 0 ? 'visible' : 'hidden',
          }}
        >
          <Box
            sx={{
              fontSize: 11,
              fontWeight: 700,
              bgcolor: 'rgb(255, 211, 211)',
              color: '#A32D2D',
              borderRadius: '4px',
              px: '7px',
              py: '2px',
            }}
          >
            {rating} / 5
          </Box>
          <Typography
            variant="caption"
            sx={{ color: '#666', fontWeight: 500, fontSize: 12 }}
          >
            {RATING_LABELS[rating]}
          </Typography>
        </Box>

        {/* Toggle commentaire */}
        {!initialValues?.id && (
          <Box
            component="button"
            type="button"
            onClick={() => setShowTextFields(v => !v)}
            sx={{
              background: 'none',
              border: '1.5px solid rgba(0,0,0,0.15)',
              borderRadius: '12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#222',
              cursor: 'pointer',
              px: '20px',
              py: '10px',
              letterSpacing: '0.01em',
              mb: 2,
              display: 'inline-flex',
              transition: 'border-color 0.15s',
              '&:hover': { borderColor: 'rgba(0,0,0,0.35)' },
            }}
          >
            {showTextFields
              ? 'Masquer le commentaire'
              : 'Ajouter un commentaire'}
          </Box>
        )}

        {/* Titre + Contenu */}
        {showTextFields && (
          <Box>
            {/* Titre de l'avis */}
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#aaa',
                display: 'block',
                mb: '6px',
              }}
            >
              Titre
            </Typography>
            <TextField
              fullWidth
              placeholder="Titre de l'avis"
              size="small"
              {...register('title', {
                maxLength: {
                  value: TITLE_MAX,
                  message: `Le titre ne peut pas dépasser ${TITLE_MAX} caractères.`,
                },
              })}
              error={!!errors.title}
              helperText={errors.title?.message}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: 13,
                  '& fieldset': {
                    borderColor: 'rgba(0,0,0,0.15)',
                    borderWidth: '0.5px',
                  },
                  '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgb(255,150,150)',
                    borderWidth: '1px',
                  },
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'right',
                color: title.length > TITLE_MAX ? 'error.main' : '#aaa',
                fontSize: 11,
                mt: '4px',
                mb: 2,
              }}
            >
              {title.length} / {TITLE_MAX}
            </Typography>

            {/* Commentaire */}
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#aaa',
                display: 'block',
                mb: '6px',
              }}
            >
              Commentaire
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Votre avis..."
              {...register('content', {
                maxLength: {
                  value: CONTENT_MAX,
                  message: `L'avis ne peut pas dépasser ${CONTENT_MAX} caractères.`,
                },
              })}
              error={!!errors.content}
              helperText={errors.content?.message}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  fontSize: 13,
                  '& fieldset': {
                    borderColor: 'rgba(0,0,0,0.15)',
                    borderWidth: '0.5px',
                  },
                  '&:hover fieldset': { borderColor: 'rgba(0,0,0,0.25)' },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgb(255,150,150)',
                    borderWidth: '1px',
                  },
                },
              }}
            />
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'right',
                color: content.length > CONTENT_MAX ? 'error.main' : '#aaa',
                fontSize: 11,
                mt: '4px',
                mb: 2,
              }}
            >
              {content.length} / {CONTENT_MAX}
            </Typography>
          </Box>
        )}

        {/* Footer : boutons */}
        <Box
          sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}
        >
          {onCancel && (
            <Box
              component="button"
              type="button"
              onClick={onCancel}
              disabled={loading}
              sx={{
                background: 'none',
                border: '1.5px solid rgba(0,0,0,0.15)',
                borderRadius: '10px',
                px: '20px',
                py: '9px',
                fontSize: 13,
                fontWeight: 700,
                color: '#444',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'border-color 0.15s',
                '&:hover': loading ? {} : { borderColor: 'rgba(0,0,0,0.35)' },
              }}
            >
              Annuler
            </Box>
          )}
          <Box
            component="button"
            type="submit"
            disabled={!canSubmit || loading}
            sx={{
              background: 'none',
              border: '1.5px solid rgba(0,0,0,0.2)',
              borderRadius: '10px',
              px: '24px',
              py: '9px',
              fontSize: 13,
              fontWeight: 700,
              color: '#111',
              cursor: !canSubmit || loading ? 'not-allowed' : 'pointer',
              opacity: !canSubmit || loading ? 0.4 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'border-color 0.15s, transform 0.1s',
              '&:hover':
                canSubmit && !loading
                  ? {
                      borderColor: 'rgba(0,0,0,0.45)',
                      transform: 'translateY(-1px)',
                    }
                  : {},
            }}
          >
            {loading && <CircularProgress size={13} sx={{ color: '#111' }} />}
            {submitLabel(loading, initialValues?.id)}
          </Box>
        </Box>

        {success && (
          <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
            {initialValues?.id ? 'Avis mis à jour !' : 'Publié avec succès !'}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
