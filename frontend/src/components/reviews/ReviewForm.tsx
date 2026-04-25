import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/useAuth';
import { useSubmitReview } from '../../hooks/useSubmitReview';
import { t } from 'i18next';

const C = {
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentSoft: 'rgba(211,47,47,0.08)',
  accentGlow: 'rgba(211,47,47,0.18)',
  title: '#0f0f0f',
  muted: '#6e6e73',
  light: '#b0b0b8',
  white88: 'rgba(255,255,255,0.88)',
  white95: 'rgba(255,255,255,0.95)',
  inputBg: 'rgba(255,255,255,0.82)',
  inputBorder: 'rgba(241,199,199,0.55)',
  badgeBg: 'rgb(255, 211, 211)',
  badgeText: '#A32D2D',
  starFilled: 'rgb(255, 180, 180)',
  starEmpty: '#C0C0C0',
};

const FD = "'Playfair Display', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

const RATING_LABELS: Record<number, string> = {
  1: 'Mauvais',
  2: 'Médiocre',
  3: 'Correct',
  4: 'Bon',
  5: 'Excellent',
};

const TITLE_MAX = 25;
const CONTENT_MAX = 125;

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

const sectionLabelSx = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#aaa',
  display: 'block',
  mb: '6px',
  fontFamily: FB,
};

const fieldSx = {
  fontFamily: FB,
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    backgroundColor: C.inputBg,
    backdropFilter: 'blur(12px)',
    fontFamily: FB,
    fontSize: 14,
    '& fieldset': {
      borderColor: C.inputBorder,
      borderWidth: '1.25px',
    },
    '&:hover fieldset': {
      borderColor: 'rgba(211,47,47,0.3)',
    },
    '&.Mui-focused fieldset': {
      borderColor: `${C.accent}88`,
      borderWidth: '1.5px',
    },
    '&.Mui-focused': {
      boxShadow: `0 0 0 3px ${C.accentSoft}`,
    },
  },
  '& .MuiFormHelperText-root': {
    fontFamily: FB,
    fontSize: 11.5,
    ml: 0.5,
  },
};

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <path
      d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32L2.27 7.12l5.34-.78z"
      fill={filled ? C.starFilled : 'none'}
      stroke={filled ? 'none' : C.starEmpty}
      strokeWidth={filled ? 0 : 1.2}
    />
  </svg>
);

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
          px: 2.5,
          py: 2,
          background: C.white88,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${C.white95}`,
          borderRadius: '18px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}
      >
        <Typography sx={{ fontFamily: FB, fontSize: 13.5, color: C.muted }}>
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
        background: C.white88,
        backdropFilter: 'blur(28px) saturate(170%)',
        WebkitBackdropFilter: 'blur(28px) saturate(170%)',
        border: `1px solid ${C.white95}`,
        borderRadius: '22px',
        boxShadow:
          '0 2px 16px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,0.92)',
        overflow: 'hidden',
        '@keyframes softGlow': {
          '0%, 100%': {
            boxShadow:
              '0 2px 16px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,0.92), 0 0 0 0 rgba(211,47,47,0.0)',
          },
          '50%': {
            boxShadow:
              '0 2px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.92), 0 0 0 4px rgba(211,47,47,0.035)',
          },
        },
        animation: 'softGlow 3.2s ease-in-out infinite',
      }}
    >
      <Box sx={{ p: { xs: 2.5, md: 3 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            mb: 2.25,
          }}
        >
          <Typography
            sx={{
              fontFamily: FD,
              fontWeight: 700,
              fontSize: 18,
              color: C.title,
              letterSpacing: -0.3,
            }}
          >
            {initialValues?.id ? 'Modifier mon avis' : 'Votre avis'}
          </Typography>

          {showTextFields && content.length > 0 && (
            <Typography
              sx={{
                fontFamily: FB,
                fontSize: 11.5,
                color: content.length > CONTENT_MAX ? C.accent : C.light,
                fontWeight: content.length > CONTENT_MAX ? 700 : 400,
              }}
            >
              {content.length}/{CONTENT_MAX}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            height: '1px',
            mb: 2.5,
            background: `linear-gradient(to right, ${C.accentGlow}, rgba(241,199,199,0.2), transparent)`,
            borderRadius: 99,
          }}
        />

        <Typography sx={sectionLabelSx}>Note</Typography>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            mb: '8px',
          }}
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
                transition: 'transform 0.12s ease',
                '&:hover': { transform: 'translateY(-1px) scale(1.03)' },
              }}
            >
              <StarIcon filled={n <= displayRating} />
            </Box>
          ))}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 2.25,
            minHeight: 22,
            visibility: rating > 0 ? 'visible' : 'hidden',
          }}
        >
          <Box
            sx={{
              fontSize: 11,
              fontWeight: 700,
              bgcolor: C.badgeBg,
              color: C.badgeText,
              borderRadius: '999px',
              px: '8px',
              py: '3px',
              fontFamily: FB,
            }}
          >
            {rating} / 5
          </Box>
          <Typography
            sx={{
              fontFamily: FB,
              color: C.muted,
              fontWeight: 500,
              fontSize: 12.5,
            }}
          >
            {RATING_LABELS[rating]}
          </Typography>
        </Box>

        {!initialValues?.id && (
          <Box sx={{ mb: 2.25 }}>
            <Button
              type="button"
              onClick={() => setShowTextFields(v => !v)}
              variant="outlined"
              sx={{
                borderRadius: 999,
                px: 2,
                py: 0.95,
                textTransform: 'none',
                fontFamily: FB,
                fontWeight: 700,
                fontSize: 13,
                color: '#222',
                borderColor: 'rgba(0,0,0,0.14)',
                background: 'rgba(255,255,255,0.42)',
                '&:hover': {
                  borderColor: 'rgba(0,0,0,0.28)',
                  background: 'rgba(255,255,255,0.58)',
                },
              }}
            >
              {showTextFields
                ? 'Masquer le commentaire'
                : 'Ajouter un commentaire'}
            </Button>
          </Box>
        )}

        {showTextFields && (
          <Box
            sx={{ display: 'flex', flexDirection: 'column', gap: 0, mb: 2.5 }}
          >
            <Box sx={{ mb: 2 }}>
              <Typography sx={sectionLabelSx}>Titre</Typography>
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
                sx={fieldSx}
              />
              <Typography
                sx={{
                  fontFamily: FB,
                  display: 'block',
                  textAlign: 'right',
                  color: title.length > TITLE_MAX ? C.accent : C.light,
                  fontSize: 11,
                  mt: '4px',
                  mr: 0.5,
                }}
              >
                {title.length} / {TITLE_MAX}
              </Typography>
            </Box>

            <Box>
              <Typography sx={sectionLabelSx}>Commentaire</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Qu'avez-vous pensé de ce jeu ?"
                {...register('content', {
                  maxLength: {
                    value: CONTENT_MAX,
                    message: `L'avis ne peut pas dépasser ${CONTENT_MAX} caractères.`,
                  },
                })}
                error={!!errors.content}
                helperText={errors.content?.message}
                disabled={loading}
                sx={fieldSx}
              />
            </Box>
          </Box>
        )}

        <Divider sx={{ mb: 2, opacity: 0.5 }} />

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          {onCancel && (
            <Button
              type="button"
              onClick={onCancel}
              disabled={loading}
              sx={{
                borderRadius: 999,
                color: C.muted,
                px: 2,
                py: 0.8,
                fontWeight: 500,
                fontSize: 13.5,
                textTransform: 'none',
                fontFamily: FB,
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' },
              }}
            >
              {t('common.cancel')}
            </Button>
          )}

          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit || loading}
            startIcon={
              loading ? <CircularProgress size={15} color="inherit" /> : null
            }
            sx={{
              borderRadius: 999,
              px: 3,
              py: 0.9,
              fontWeight: 700,
              fontSize: 13.5,
              textTransform: 'none',
              fontFamily: FB,
              background: `linear-gradient(135deg, ${C.accent} 0%, #ef5350 100%)`,
              boxShadow: `0 4px 14px rgba(211,47,47,0.32)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
                boxShadow: `0 7px 20px rgba(211,47,47,0.38)`,
                transform: 'translateY(-1px)',
              },
              '&:disabled': {
                background: 'rgba(0,0,0,0.08)',
                boxShadow: 'none',
              },
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
              fontFamily: FB,
              fontSize: 13.5,
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
              fontFamily: FB,
              fontSize: 13.5,
            }}
          >
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
