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
  accentSoft: 'rgba(211,47,47,0.08)',
  accentGlow: 'rgba(211,47,47,0.18)',
  title: '#0f0f0f',
  muted: '#6e6e73',
  light: '#b0b0b8',
  w88: 'rgba(255,255,255,0.88)',
  w95: 'rgba(255,255,255,0.95)',
  inputBg: 'rgba(255,255,255,0.82)',
  inputBorder: 'rgba(241,199,199,0.55)',
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

type ReviewFormValues = { title: string; content: string; rating: number };

type ReviewFormProps = Readonly<{
  gameId: string;
  resolveGameId?: () => Promise<string | number | null>;
  initialValues?: Partial<ReviewFormValues> & { id?: number };
  onSuccess?: (review: { id: number; title?: string; content: string }) => void;
  onCancel?: () => void;
}>;

function submitLabel(loading: boolean, existingId?: number) {
  if (loading) return 'Envoi…';
  return existingId ? 'Mettre à jour' : 'Publier';
}

/* ── Shared field style ── */
const fieldSx = {
  fontFamily: FB,
  '& .MuiOutlinedInput-root': {
    borderRadius: '16px',
    backgroundColor: C.inputBg,
    backdropFilter: 'blur(12px)',
    fontFamily: FB,
    fontSize: 14,
    '& fieldset': { borderColor: C.inputBorder, borderWidth: '1.5px' },
    '&:hover fieldset': { borderColor: 'rgba(211,47,47,0.3)' },
    '&.Mui-focused fieldset': {
      borderColor: `${C.accent}88`,
      borderWidth: '1.5px',
    },
    '&.Mui-focused': { boxShadow: `0 0 0 3px ${C.accentSoft}` },
  },
  '& .MuiInputLabel-root': { fontFamily: FB, color: C.muted, fontSize: 14 },
  '& .MuiInputLabel-root.Mui-focused': { color: C.accent },
  '& .MuiFormHelperText-root': { fontFamily: FB, fontSize: 11.5 },
};

export default function ReviewForm({
  gameId,
  resolveGameId,
  initialValues,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { isAuthenticated } = useAuth();
  const { loading, success, error, submitReview } = useSubmitReview();
  const [showText, setShowText] = useState(
    !!(initialValues?.id || initialValues?.title || initialValues?.content)
  );

  useEffect(() => {
    if (initialValues?.id) setShowText(true);
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
      setShowText(false);
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
    const rid = resolveGameId ? await resolveGameId() : gameId;
    if (!rid) return;
    const result = await submitReview(
      String(rid),
      data.content,
      initialValues?.id,
      data.title || undefined,
      data.rating || undefined
    );
    if (result && onSuccess)
      onSuccess(result as { id: number; title?: string; content: string });
  }

  /* ── Not authenticated ── */
  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background: C.w88,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${C.w95}`,
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
        background: C.w88,
        backdropFilter: 'blur(28px) saturate(170%)',
        WebkitBackdropFilter: 'blur(28px) saturate(170%)',
        border: `1px solid ${C.w95}`,
        borderRadius: '22px',
        boxShadow:
          '0 2px 16px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,0.92)',
        p: { xs: 2.5, md: 3 },
      }}
    >
      {/* ── En-tête sobre ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          mb: 2.5,
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
        {/* Compteur discret visible seulement si texte */}
        {showText && content.length > 0 && (
          <Typography
            sx={{
              fontFamily: FB,
              fontSize: 11.5,
              color: content.length > 125 ? C.accent : C.light,
              fontWeight: content.length > 125 ? 700 : 400,
            }}
          >
            {content.length}/125
          </Typography>
        )}
      </Box>

      {/* Séparateur */}
      <Box
        sx={{
          height: '1px',
          mb: 2.5,
          background: `linear-gradient(to right,${C.accentGlow},rgba(241,199,199,0.2),transparent)`,
          borderRadius: 99,
        }}
      />

      {/* ── Étoiles + label inline ── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          mb: showText ? 2.5 : 2,
        }}
      >
        <Rating
          value={rating}
          onChange={(_, v) =>
            setValue('rating', v ?? 0, { shouldValidate: true })
          }
          sx={{
            '& .MuiRating-iconFilled': { color: C.accent },
            '& .MuiRating-iconHover': { color: C.accentDark },
          }}
        />
        <Typography
          sx={{
            fontFamily: FB,
            fontSize: 12.5,
            color: C.muted,
            fontWeight: 500,
            opacity: rating > 0 ? 1 : 0,
            transition: 'opacity 0.2s ease',
          }}
        >
          {RATING_LABELS[rating]}
        </Typography>
      </Box>

      {/* ── Lien "Ajouter un commentaire" ── */}
      {!showText && !initialValues?.id && (
        <Button
          variant="text"
          size="small"
          onClick={() => setShowText(true)}
          sx={{
            mb: 2,
            textTransform: 'none',
            fontFamily: FB,
            fontWeight: 600,
            color: C.muted,
            fontSize: 13,
            px: 0,
            '&:hover': { color: C.accent, background: 'transparent' },
          }}
        >
          + Ajouter un commentaire
        </Button>
      )}

      {/* ── Champs texte (titre optionnel + contenu) ── */}
      {showText && (
        <Box
          sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2.5 }}
        >
          {/* Titre optionnel — compact */}
          <Box>
            <TextField
              label="Titre (optionnel)"
              fullWidth
              size="small"
              {...register('title', {
                maxLength: { value: 25, message: 'Max 25 caractères.' },
              })}
              error={!!errors.title}
              helperText={errors.title?.message}
              disabled={loading}
              sx={fieldSx}
            />
            {title.length > 0 && (
              <Typography
                sx={{
                  fontFamily: FB,
                  fontSize: 11,
                  mt: 0.4,
                  ml: 1,
                  color: title.length > 25 ? C.accent : C.light,
                }}
              >
                {title.length}/25
              </Typography>
            )}
          </Box>

          {/* Textarea principal */}
          <TextField
            label="Votre avis"
            multiline
            rows={4}
            fullWidth
            placeholder="Qu'avez-vous pensé de ce jeu ?"
            {...register('content', {
              maxLength: { value: 125, message: 'Max 125 caractères.' },
            })}
            error={!!errors.content}
            helperText={errors.content?.message}
            disabled={loading}
            sx={fieldSx}
          />
        </Box>
      )}

      {/* ── Actions ── */}
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
            Annuler
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
            background: `linear-gradient(135deg,${C.accent} 0%,#ef5350 100%)`,
            boxShadow: `0 4px 14px rgba(211,47,47,0.32)`,
            '&:hover': {
              background: `linear-gradient(135deg,${C.accentDark} 0%,${C.accent} 100%)`,
              boxShadow: `0 7px 20px rgba(211,47,47,0.38)`,
              transform: 'translateY(-1px)',
            },
            '&:disabled': { background: 'rgba(0,0,0,0.08)', boxShadow: 'none' },
            transition: 'all 0.18s ease',
          }}
        >
          {submitLabel(loading, initialValues?.id)}
        </Button>
      </Box>

      {success && (
        <Alert
          severity="success"
          sx={{ mt: 2, borderRadius: '14px', fontFamily: FB, fontSize: 13.5 }}
        >
          {initialValues?.id ? 'Avis mis à jour !' : 'Publié avec succès !'}
        </Alert>
      )}
      {error && (
        <Alert
          severity="error"
          sx={{ mt: 2, borderRadius: '14px', fontFamily: FB, fontSize: 13.5 }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
}
