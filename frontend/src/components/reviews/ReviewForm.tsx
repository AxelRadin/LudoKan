import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Rating,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/useAuth';
import { useSubmitReview } from '../../hooks/useSubmitReview';

const C = {
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentGlow: 'rgba(211,47,47,0.15)',
  title: '#0f0f0f',
  muted: '#6e6e73',
  light: '#a0a0a8',
  softBorder: 'rgba(241,199,199,0.5)',
  border: '#f1c7c7',
  glassBorder: 'rgba(255,255,255,0.9)',
  cardBg: 'rgba(255,255,255,0.72)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

const fieldSx = {
  fontFamily: FONT_BODY,
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    backgroundColor: 'rgba(255,255,255,0.85)',
    fontFamily: FONT_BODY,
    fontSize: 14.5,
    '& fieldset': { borderColor: C.softBorder },
    '&:hover fieldset': { borderColor: C.border },
    '&.Mui-focused fieldset': { borderColor: `${C.accent}88` },
  },
  '& .MuiInputLabel-root': { fontFamily: FONT_BODY },
  '& .MuiInputLabel-root.Mui-focused': { color: C.accent },
  '& .MuiFormHelperText-root': { fontFamily: FONT_BODY, fontSize: 12 },
};

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
  resolveGameId?: () => Promise<string | number | null>;
  initialValues?: Partial<ReviewFormValues> & { id?: number };
  onSuccess?: (review: { id: number; title?: string; content: string }) => void;
  onCancel?: () => void;
}>;

function submitLabel(loading: boolean, existingId?: number): string {
  if (loading) return 'Envoi…';
  return existingId ? 'Mettre à jour' : 'Publier';
}

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

  useEffect(() => {
    if (initialValues?.id) setShowTextFields(true);
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
    if (result && onSuccess)
      onSuccess(result as { id: number; title?: string; content: string });
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          p: 2.5,
          background: C.cardBg,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          border: `1px solid ${C.glassBorder}`,
          borderRadius: '16px',
        }}
      >
        <Typography
          sx={{ fontFamily: FONT_BODY, fontSize: 14, color: C.muted }}
        >
          Connectez-vous pour écrire un avis.
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
        background: C.cardBg,
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: `1px solid ${C.glassBorder}`,
        borderRadius: '20px',
        p: { xs: 2.5, md: 3.5 },
      }}
    >
      {/* Header */}
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: C.accent,
          mb: 0.5,
          fontFamily: FONT_BODY,
        }}
      >
        Votre opinion
      </Typography>
      <Typography
        sx={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 20,
          color: C.title,
          letterSpacing: -0.3,
          mb: 2.5,
        }}
      >
        {initialValues?.id ? 'Modifier mon avis' : 'Donner votre avis'}
      </Typography>

      {/* Thin accent line */}
      <Box
        sx={{
          height: '1px',
          background: `linear-gradient(to right, ${C.accent}33, ${C.border}, transparent)`,
          mb: 2.5,
        }}
      />

      {/* Étoiles */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: C.light,
            mb: 1,
            fontFamily: FONT_BODY,
          }}
        >
          Note
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Rating
            value={rating}
            onChange={(_, value) =>
              setValue('rating', value ?? 0, { shouldValidate: true })
            }
            sx={{
              '& .MuiRating-iconFilled': { color: C.accent },
              '& .MuiRating-iconHover': { color: C.accentDark },
            }}
          />
          {rating > 0 && (
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: 13,
                color: C.muted,
                fontWeight: 500,
              }}
            >
              {RATING_LABELS[rating]}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Bouton afficher champs texte */}
      {!showTextFields && !initialValues?.id && (
        <Button
          variant="text"
          size="small"
          onClick={() => setShowTextFields(true)}
          sx={{
            mb: 2,
            textTransform: 'none',
            fontFamily: FONT_BODY,
            fontWeight: 600,
            color: C.muted,
            fontSize: 13.5,
            px: 0,
            '&:hover': { color: C.accent, background: 'transparent' },
          }}
        >
          + Ajouter un commentaire
        </Button>
      )}

      {/* Titre + Contenu */}
      {showTextFields && (
        <>
          <TextField
            label="Titre de l'avis"
            fullWidth
            size="small"
            {...register('title', {
              maxLength: {
                value: 25,
                message: 'Le titre ne peut pas dépasser 25 caractères.',
              },
            })}
            error={!!errors.title}
            helperText={errors.title?.message}
            disabled={loading}
            sx={{ ...fieldSx, mb: 0.5 }}
          />
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              fontSize: 12.5,
              color: title.length > 25 ? C.accent : C.light,
              fontWeight: title.length > 25 ? 700 : 400,
              mb: 2,
              display: 'block',
            }}
          >
            {title.length} / 25
          </Typography>

          <TextField
            label="Votre avis"
            multiline
            rows={4}
            fullWidth
            placeholder="Qu'avez-vous pensé de ce jeu ?"
            {...register('content', {
              maxLength: {
                value: 125,
                message: "L'avis ne peut pas dépasser 125 caractères.",
              },
            })}
            error={!!errors.content}
            helperText={errors.content?.message}
            disabled={loading}
            sx={{ ...fieldSx, mb: 0.5 }}
          />
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              fontSize: 12.5,
              color: content.length > 125 ? C.accent : C.light,
              fontWeight: content.length > 125 ? 700 : 400,
              mb: 2,
              display: 'block',
            }}
          >
            {content.length} / 125
          </Typography>
        </>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
        {onCancel && (
          <Button
            onClick={onCancel}
            disabled={loading}
            sx={{
              borderRadius: 999,
              color: C.muted,
              px: 2.5,
              py: 0.9,
              fontWeight: 500,
              fontSize: 14,
              textTransform: 'none',
              fontFamily: FONT_BODY,
              '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
            }}
          >
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={!canSubmit || loading}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{
            borderRadius: 999,
            px: 3.5,
            py: 1,
            fontWeight: 700,
            fontSize: 14,
            textTransform: 'none',
            fontFamily: FONT_BODY,
            background: `linear-gradient(135deg, ${C.accent} 0%, #e53935 100%)`,
            boxShadow: `0 4px 18px ${C.accentGlow}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
              boxShadow: `0 6px 24px rgba(211,47,47,0.28)`,
              transform: 'translateY(-1px)',
            },
            '&:disabled': { background: 'rgba(0,0,0,0.1)', boxShadow: 'none' },
            transition: 'all 0.18s ease',
          }}
        >
          {submitLabel(loading, initialValues?.id)}
        </Button>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{
            mt: 2,
            borderRadius: '14px',
            fontFamily: FONT_BODY,
            fontSize: 14,
          }}
        >
          {initialValues?.id ? 'Avis mis à jour !' : 'Publié avec succès !'}
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 2,
            borderRadius: '14px',
            fontFamily: FONT_BODY,
            fontSize: 14,
          }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
}
