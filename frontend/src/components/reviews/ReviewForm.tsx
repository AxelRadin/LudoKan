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
  accentSoft: 'rgba(211,47,47,0.10)',
  accentGlow: 'rgba(211,47,47,0.22)',
  title: '#0f0f0f',
  text: '#2b2b2b',
  muted: '#6e6e73',
  light: '#b0b0b8',
  glass: 'rgba(255,255,255,0.52)',
  glassBorder: 'rgba(255,255,255,0.72)',
  inputBg: 'rgba(255,255,255,0.7)',
  inputBorder: 'rgba(241,199,199,0.6)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

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

  /* ── Shared field style ── */
  const fieldSx = {
    fontFamily: FONT_BODY,
    '& .MuiOutlinedInput-root': {
      borderRadius: '18px',
      backgroundColor: C.inputBg,
      backdropFilter: 'blur(12px)',
      fontFamily: FONT_BODY,
      fontSize: 14.5,
      transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      '& fieldset': { borderColor: C.inputBorder, borderWidth: '1.5px' },
      '&:hover fieldset': { borderColor: 'rgba(211,47,47,0.35)' },
      '&.Mui-focused fieldset': {
        borderColor: `${C.accent}88`,
        borderWidth: '1.5px',
      },
      '&.Mui-focused': { boxShadow: `0 0 0 4px ${C.accentSoft}` },
    },
    '& .MuiInputLabel-root': { fontFamily: FONT_BODY, color: C.muted },
    '& .MuiInputLabel-root.Mui-focused': { color: C.accent },
    '& .MuiFormHelperText-root': { fontFamily: FONT_BODY, fontSize: 12 },
  };

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          p: 3,
          background: C.glass,
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          border: `1.5px solid ${C.glassBorder}`,
          borderRadius: '28px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
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
        background: C.glass,
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: `1.5px solid ${C.glassBorder}`,
        borderRadius: '32px',
        boxShadow:
          '0 4px 32px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.85)',
        p: { xs: 3, md: 4 },
        position: 'relative',
        overflow: 'hidden',
        /* Orb décoratif */
        '&::before': {
          content: '""',
          position: 'absolute',
          top: -60,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: C.accentSoft,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          px: 1.5,
          py: 0.4,
          borderRadius: 999,
          background: C.accentSoft,
          border: `1px solid ${C.accentGlow}`,
          mb: 1,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: C.accent,
            lineHeight: 1,
          }}
        >
          Votre opinion
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 20,
          color: C.title,
          letterSpacing: -0.3,
          mb: 3,
        }}
      >
        {initialValues?.id ? 'Modifier mon avis' : 'Donner votre avis'}
      </Typography>

      {/* Séparateur fluide */}
      <Box
        sx={{
          height: '1.5px',
          mb: 3,
          background: `linear-gradient(to right, ${C.accentGlow}, rgba(241,199,199,0.3), transparent)`,
          borderRadius: 99,
        }}
      />

      {/* ── Étoiles ── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: FONT_BODY,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color: C.light,
            mb: 1.25,
          }}
        >
          Note
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1.5,
            px: 2,
            py: 1.25,
            borderRadius: '20px',
            background: C.inputBg,
            backdropFilter: 'blur(12px)',
            border: `1.5px solid ${C.inputBorder}`,
            transition: 'box-shadow 0.2s ease',
            '&:hover': { boxShadow: `0 0 0 4px ${C.accentSoft}` },
          }}
        >
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
                whiteSpace: 'nowrap',
              }}
            >
              {RATING_LABELS[rating]}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Bouton ajouter commentaire */}
      {!showTextFields && !initialValues?.id && (
        <Button
          variant="text"
          size="small"
          onClick={() => setShowTextFields(true)}
          sx={{
            mb: 2.5,
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

      {/* ── Champs texte ── */}
      {showTextFields && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2.5 }}>
          <Box>
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
              sx={fieldSx}
            />
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: 12,
                mt: 0.5,
                ml: 1,
                color: title.length > 25 ? C.accent : C.light,
                fontWeight: title.length > 25 ? 700 : 400,
              }}
            >
              {title.length} / 25
            </Typography>
          </Box>

          <Box>
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
              sx={fieldSx}
            />
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: 12,
                mt: 0.5,
                ml: 1,
                color: content.length > 125 ? C.accent : C.light,
                fontWeight: content.length > 125 ? 700 : 400,
              }}
            >
              {content.length} / 125
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Actions ── */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.5,
          mt: showTextFields ? 0 : 1,
        }}
      >
        {onCancel && (
          <Button
            onClick={onCancel}
            disabled={loading}
            sx={{
              borderRadius: 999,
              color: C.muted,
              px: 2.5,
              py: 1,
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
            background: `linear-gradient(135deg, ${C.accent} 0%, #ef5350 100%)`,
            boxShadow: `0 4px 18px ${C.accentGlow}`,
            '&:hover': {
              background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
              boxShadow: `0 8px 28px rgba(211,47,47,0.32)`,
              transform: 'translateY(-2px)',
            },
            '&:disabled': { background: 'rgba(0,0,0,0.1)', boxShadow: 'none' },
            transition: 'all 0.2s ease',
          }}
        >
          {submitLabel(loading, initialValues?.id)}
        </Button>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{
            mt: 2.5,
            borderRadius: '18px',
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
            mt: 2.5,
            borderRadius: '18px',
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
