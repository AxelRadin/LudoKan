import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { apiDelete } from '../../services/api';
import { useReviews } from '../../hooks/useReviews';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';

const F = "'Outfit', sans-serif";

type Review = {
  id: number;
  title?: string;
  content: string;
  rating?: { value: number };
  created_at?: string;
  date_created?: string;
  user?: { id: number; pseudo?: string; username?: string };
};

type ReviewSectionProps = Readonly<{
  gameId: string;
  resolveGameId?: () => Promise<string | number | null>;
  userReview: Review | null;
  currentUserId: number | null;
  onReviewChange: (review: Review | null) => void;
}>;

export default function ReviewSection({
  gameId,
  resolveGameId,
  userReview,
  currentUserId,
  onReviewChange,
}: ReviewSectionProps) {
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);
  const { reviews, isLoading, error, addReview, updateReview, removeReview } =
    useReviews(gameId || null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const accent = isDark ? '#ef5350' : '#d43c3c';
  const ink = isDark ? '#f5e6e6' : '#241818';
  const cardBg = isDark ? 'rgba(40,20,20,0.65)' : 'rgba(255,255,255,0.80)';
  const cardBorder = isDark ? 'rgba(239,83,80,0.14)' : 'rgba(198,40,40,0.10)';

  async function confirmDeleteReview() {
    if (reviewToDelete === null) return;
    try {
      await apiDelete(`/api/reviews/${reviewToDelete}/`);
      if (userReview?.id === reviewToDelete) {
        onReviewChange(null);
      }
      removeReview(reviewToDelete);
    } catch {
      alert("Erreur lors de la suppression de l'avis.");
    } finally {
      setReviewToDelete(null);
    }
  }

  function handleEditSuccess(updated: Review) {
    onReviewChange({ ...userReview, ...updated } as Review);
    updateReview({ ...userReview, ...updated } as Review);
    setEditingReview(null);
  }

  function handleReviewCreated(review: Review) {
    onReviewChange(review);
    addReview(review);
  }

  const otherReviews = reviews.filter(r => r.id !== userReview?.id);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Titre section */}
      <Box sx={{ position: 'relative', pl: '14px', mb: 3 }}>
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '80%',
            background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
            borderRadius: '2px',
            opacity: 0.8,
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{ width: 14, height: '1px', background: accent, opacity: 0.6 }}
          />
          <Typography
            sx={{
              fontFamily: F,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: accent,
              opacity: 0.9,
            }}
          >
            Votre avis
          </Typography>
        </Box>
      </Box>

      {/* Card avis utilisateur ou formulaire */}
      <Box
        sx={{
          background: cardBg,
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
          border: `1px solid ${cardBorder}`,
          borderRadius: '16px',
          p: { xs: '18px', md: '22px 26px' },
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isDark
            ? '0 4px 24px rgba(0,0,0,0.25)'
            : '0 4px 24px rgba(198,40,40,0.06)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 16,
            right: 16,
            height: '1px',
            background: `linear-gradient(to right, ${accent} 0%, transparent 60%)`,
            opacity: isDark ? 0.45 : 0.3,
          },
        }}
      >
        {userReview && !editingReview ? (
          <ReviewCard
            review={userReview}
            isOwner={userReview.user?.id === currentUserId}
            onEdit={review => setEditingReview(review as Review)}
            onDelete={setReviewToDelete}
          />
        ) : (
          <ReviewForm
            gameId={gameId}
            resolveGameId={resolveGameId}
            initialValues={
              editingReview
                ? { ...editingReview, rating: editingReview.rating?.value }
                : undefined
            }
            onSuccess={review => {
              if (editingReview) {
                handleEditSuccess(review as Review);
              } else {
                handleReviewCreated(review as Review);
              }
            }}
            onCancel={editingReview ? () => setEditingReview(null) : undefined}
          />
        )}
      </Box>

      {/* Liste des autres avis */}
      {otherReviews.length > 0 && (
        <Box sx={{ position: 'relative', pl: '14px', mb: 2 }}>
          <Box
            sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: '3px',
              height: '80%',
              background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
              borderRadius: '2px',
              opacity: 0.8,
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 14,
                height: '1px',
                background: accent,
                opacity: 0.6,
              }}
            />
            <Typography
              sx={{
                fontFamily: F,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: accent,
                opacity: 0.9,
              }}
            >
              Autres avis
            </Typography>
          </Box>
        </Box>
      )}

      <ReviewsList
        otherReviews={otherReviews}
        isLoading={isLoading}
        error={error}
        currentUserId={currentUserId}
        onEditReview={review => setEditingReview(review as Review)}
        onDeleteReview={setReviewToDelete}
      />

      {/* Dialog suppression */}
      <Dialog
        open={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        PaperProps={{
          sx: {
            borderRadius: '16px',
            background: isDark
              ? 'rgba(40,20,20,0.95)'
              : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(24px)',
            border: `1px solid ${cardBorder}`,
            boxShadow: isDark
              ? '0 24px 64px rgba(0,0,0,0.5)'
              : '0 24px 64px rgba(198,40,40,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: F,
            fontWeight: 700,
            fontSize: 16,
            color: ink,
            pb: 1,
          }}
        >
          Supprimer votre avis ?
        </DialogTitle>
        <DialogActions
          sx={{ px: 3, pb: 2.5, gap: 1, justifyContent: 'center' }}
        >
          <Button
            size="small"
            onClick={() => setReviewToDelete(null)}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontFamily: F,
              fontWeight: 600,
              fontSize: 13,
              px: 2,
              border: `1px solid ${cardBorder}`,
              color: ink,
              '&:hover': {
                background: isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.04)',
              },
            }}
          >
            Annuler
          </Button>
          <Button
            size="small"
            onClick={confirmDeleteReview}
            variant="contained"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontFamily: F,
              fontWeight: 700,
              fontSize: 13,
              px: 2,
              background: `linear-gradient(135deg, ${accent} 0%, #ef5350 100%)`,
              boxShadow: '0 4px 14px rgba(211,47,47,0.32)',
              '&:hover': {
                background: `linear-gradient(135deg, #b71c1c 0%, ${accent} 100%)`,
                boxShadow: '0 6px 18px rgba(211,47,47,0.42)',
              },
            }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
