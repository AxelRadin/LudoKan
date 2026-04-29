import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogTitle,
  Paper,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { useUserReviews, type ReviewItem } from '../hooks/useUserReviews';
import { apiDelete } from '../services/api';
import PageLayout from '../components/PageLayout';
import ReviewCard from '../components/reviews/ReviewCard';
import ReviewForm from '../components/reviews/ReviewForm';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

export default function UserReviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { reviews, isLoading, error, removeReview, updateReview } =
    useUserReviews(user?.id ?? null);

  const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<number | null>(null);

  const handleDeleteConfirm = async () => {
    if (reviewToDelete === null) return;
    try {
      await apiDelete(`/api/reviews/${reviewToDelete}/`);
      removeReview(reviewToDelete);
      setReviewToDelete(null);
    } catch {
      alert("Erreur lors de la suppression de l'avis.");
    }
  };

  const handleEditSuccess = (updated: any) => {
    if (editingReview) {
      updateReview({ ...editingReview, ...updated });
      setEditingReview(null);
    }
  };

  if (!user && !isLoading) {
    return (
      <PageLayout title={t('profilePage.reviewsLabel')}>
        <Typography>{t('auth.loginPrompt')}</Typography>
      </PageLayout>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="error" />
        </Box>
      );
    }

    if (error) {
      return (
        <Typography color="error" align="center">
          {error}
        </Typography>
      );
    }

    if (reviews.length === 0) {
      return (
        <Typography align="center" color="text.secondary">
          Vous n'avez pas encore publié d'avis.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {reviews.map(review => (
          <Box key={review.id} sx={{ position: 'relative' }}>
            {/* Header with game info */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: -2,
                pb: 4,
                borderRadius: '16px 16px 0 0',
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'rgba(255,255,255,0.8)',
                },
              }}
              onClick={() => navigate(`/game/${review.game.id}`)}
            >
              <Box
                component="img"
                src={review.game.cover_url}
                alt={review.game.name}
                sx={{
                  width: 50,
                  height: 70,
                  objectFit: 'cover',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              />
              <Box>
                <Typography
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 18,
                    color: '#111',
                  }}
                >
                  {review.game.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    color: 'text.secondary',
                  }}
                >
                  Cliquez pour voir le jeu
                </Typography>
              </Box>
            </Paper>

            {/* Review Card */}
            {editingReview?.id === review.id ? (
              <Box
                sx={{
                  p: 2,
                  bgcolor: '#fff',
                  borderRadius: 3,
                  border: '1px solid #ffcfcf',
                }}
              >
                <ReviewForm
                  gameId={String(review.game.id)}
                  initialValues={{
                    ...review,
                    rating: review.rating?.value,
                  }}
                  onSuccess={handleEditSuccess}
                  onCancel={() => setEditingReview(null)}
                />
              </Box>
            ) : (
              <ReviewCard
                review={review as any}
                isOwner={true}
                onEdit={() => setEditingReview(review)}
                onDelete={id => setReviewToDelete(id)}
              />
            )}
          </Box>
        ))}
      </Box>
    );
  };

  return (
    <PageLayout title={t('profilePage.reviewsLabel')}>
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>{renderContent()}</Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 },
        }}
      >
        <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          Supprimer cet avis ?
        </DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setReviewToDelete(null)}
            sx={{ borderRadius: 2 }}
          >
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={handleDeleteConfirm}
            sx={{ borderRadius: 2 }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
