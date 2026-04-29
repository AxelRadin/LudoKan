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
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import {
  DEFAULT_USER_REVIEWS_FILTERS,
  userReviewsFiltersActive,
  type UserReviewsListFilters,
} from '../constants/userReviewsFilters';
import { useUserReviews, type ReviewItem } from '../hooks/useUserReviews';
import { apiDelete } from '../services/api';
import PageLayout from '../components/PageLayout';
import ReviewCard from '../components/reviews/ReviewCard';
import ReviewForm from '../components/reviews/ReviewForm';
import UserReviewsFiltersBar from '../components/reviews/UserReviewsFiltersBar';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

export default function UserReviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_USER_REVIEWS_FILTERS);
  const patchFilters = useCallback((patch: Partial<UserReviewsListFilters>) => {
    setFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const {
    reviews,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext,
    loadMorePage,
    removeReview,
    updateReview,
  } = useUserReviews(user?.id ?? null, filters);

  const filtersActive = userReviewsFiltersActive(filters);

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

    if (totalCount === 0) {
      return (
        <Typography align="center" color="text.secondary">
          {filtersActive
            ? t('userReviewsPage.emptyFiltered')
            : t('userReviewsPage.emptyNone')}
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
                  {t('userReviewsPage.clickToOpenGame')}
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
        {hasNext ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              pt: 1,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              onClick={loadMorePage}
              disabled={isLoadingMore}
              sx={{ textTransform: 'none' }}
            >
              {isLoadingMore ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  {t('gamePageBody.reviewsLoadingMore')}
                </>
              ) : (
                t('gamePageBody.reviewsLoadMore')
              )}
            </Button>
            {loadMoreError ? (
              <Typography variant="caption" color="error">
                {loadMoreError}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
    );
  };

  return (
    <PageLayout title={t('profilePage.reviewsLabel')}>
      <Box sx={{ maxWidth: 800, mx: 'auto', py: 4 }}>
        {user ? (
          <UserReviewsFiltersBar
            filters={filters}
            onPatch={patchFilters}
            disabled={isLoading}
          />
        ) : null}
        {typeof filters.ratingFilter === 'number' ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.6 }}
          >
            {t('userReviewsPage.bannerStarFilter', {
              stars: filters.ratingFilter,
            })}
          </Typography>
        ) : filters.ratingFilter === 'none' ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, lineHeight: 1.6 }}
          >
            {t('userReviewsPage.bannerNoRatingFilter')}
          </Typography>
        ) : null}
        {renderContent()}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        PaperProps={{
          sx: { borderRadius: '16px', p: 1 },
        }}
      >
        <DialogTitle sx={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          {t('userReviewsPage.deleteConfirmTitle')}
        </DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setReviewToDelete(null)}
            sx={{ borderRadius: 2 }}
          >
            {t('userReviewsPage.deleteCancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={handleDeleteConfirm}
            sx={{ borderRadius: 2 }}
          >
            {t('userReviewsPage.deleteConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
