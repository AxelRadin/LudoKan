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
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../contexts/useAuth';
import {
  DEFAULT_USER_REVIEWS_FILTERS,
  userReviewsFiltersActive,
  type UserReviewsListFilters,
} from '../constants/userReviewsFilters';
import { useUserReviews, type ReviewItem } from '../hooks/useUserReviews';
import { apiDelete } from '../services/api';
import ReviewCard from '../components/reviews/ReviewCard';
import ReviewForm from '../components/reviews/ReviewForm';
import UserReviewsFiltersBar from '../components/reviews/UserReviewsFiltersBar';

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

// Hook pour obtenir les couleurs dynamiques basées sur le thème
function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(
    () => ({
      pageBg: isDark ? '#1a1010' : '#ffd3d3',
      shellBg: isDark ? '#2a2020' : '#fff7f7',
      cardBg: isDark ? 'rgba(42,32,32,0.72)' : 'rgba(255,255,255,0.72)',
      border: isDark ? '#4a3030' : '#f1c7c7',
      softBorder: isDark ? 'rgba(74,48,48,0.5)' : 'rgba(241,199,199,0.5)',
      title: isDark ? '#f5e6e6' : '#0f0f0f',
      text: isDark ? '#e0d0d0' : '#2b2b2b',
      muted: isDark ? '#9e7070' : '#6e6e73',
      light: isDark ? '#b49393' : '#a0a0a8',
      accent: '#FF3D3D',
      accentDark: '#b71c1c',
      accentGlow: isDark ? 'rgba(255,61,61,0.25)' : 'rgba(211,47,47,0.15)',
      glass: isDark ? 'rgba(42,32,32,0.78)' : 'rgba(255,250,250,0.78)',
      glassBorder: isDark ? 'rgba(74,48,48,0.9)' : 'rgba(255,255,255,0.9)',
      dialogBg: isDark ? 'rgba(42,32,32,0.96)' : 'rgba(255,249,249,0.96)',
    }),
    [isDark]
  );
}

function getPageBackground(isDark: boolean, pageBg: string): string {
  if (isDark) {
    return `
      url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"),
      radial-gradient(ellipse 120% 80% at 15% -10%, rgba(74,48,48,0.6) 0%, transparent 55%),
      radial-gradient(ellipse 80% 60% at 90% 110%, rgba(255,61,61,0.12) 0%, transparent 50%),
      ${pageBg}
    `;
  }

  return `
    url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"),
    radial-gradient(ellipse 120% 80% at 15% -10%, rgba(255,200,200,0.6) 0%, transparent 55%),
    radial-gradient(ellipse 80% 60% at 90% 110%, rgba(211,47,47,0.07) 0%, transparent 50%),
    ${pageBg}
  `;
}

export default function UserReviewsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const C = useThemeColors();

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
      <Box
        sx={{
          minHeight: '100vh',
          background: getPageBackground(isDark, C.pageBg),
          px: { xs: 2, md: 4, lg: 6 },
          py: { xs: 3, md: 5 },
        }}
      >
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          <Typography sx={{ fontFamily: FONT_BODY, color: C.text }}>
            {t('auth.loginPrompt')}
          </Typography>
        </Box>
      </Box>
    );
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: C.accent }} />
        </Box>
      );
    }

    if (error) {
      return (
        <Typography
          sx={{ fontFamily: FONT_BODY, color: C.accent }}
          align="center"
        >
          {error}
        </Typography>
      );
    }

    if (totalCount === 0) {
      return (
        <Typography
          align="center"
          sx={{ fontFamily: FONT_BODY, color: C.muted }}
        >
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
                background: C.cardBg,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${C.softBorder}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: C.glass,
                  transform: 'translateY(-2px)',
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
                    color: C.title,
                  }}
                >
                  {review.game.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 12,
                    color: C.muted,
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
                  bgcolor: C.cardBg,
                  borderRadius: 3,
                  border: `1px solid ${C.border}`,
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
              sx={{
                textTransform: 'none',
                fontFamily: FONT_BODY,
                borderColor: C.accent,
                color: C.accent,
                borderRadius: '999px',
                px: 3,
                '&:hover': {
                  borderColor: C.accentDark,
                  bgcolor: `${C.accent}10`,
                },
              }}
            >
              {isLoadingMore ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1, color: C.accent }} />
                  {t('gamePageBody.reviewsLoadingMore')}
                </>
              ) : (
                t('gamePageBody.reviewsLoadMore')
              )}
            </Button>
            {loadMoreError ? (
              <Typography
                variant="caption"
                sx={{ fontFamily: FONT_BODY, color: C.accent }}
              >
                {loadMoreError}
              </Typography>
            ) : null}
          </Box>
        ) : null}
      </Box>
    );
  };

  let filtersBannerText: string | null = null;

  if (typeof filters.ratingFilter === 'number') {
    filtersBannerText = t('userReviewsPage.bannerStarFilter', {
      stars: filters.ratingFilter,
    });
  } else if (filters.ratingFilter === 'none') {
    filtersBannerText = t('userReviewsPage.bannerNoRatingFilter');
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: getPageBackground(isDark, C.pageBg),
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 800, mx: 'auto' }}>
        {/* Page Title */}
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 900,
            fontSize: { xs: 32, md: 40 },
            color: C.title,
            mb: 4,
            letterSpacing: -0.8,
          }}
        >
          {t('profilePage.reviewsLabel')}
        </Typography>

        {user ? (
          <UserReviewsFiltersBar
            filters={filters}
            onPatch={patchFilters}
            disabled={isLoading}
          />
        ) : null}
        {filtersBannerText ? (
          <Typography
            variant="body2"
            sx={{
              mb: 2,
              lineHeight: 1.6,
              fontFamily: FONT_BODY,
              color: C.muted,
            }}
          >
            {filtersBannerText}
          </Typography>
        ) : null}
        {renderContent()}
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={reviewToDelete !== null}
        onClose={() => setReviewToDelete(null)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            boxShadow: '0 32px 80px rgba(0,0,0,0.18)',
            background: C.dialogBg,
            backdropFilter: 'blur(24px)',
            border: `1px solid ${C.glassBorder}`,
            p: 1,
          },
        }}
        BackdropProps={{
          sx: {
            backdropFilter: 'blur(6px)',
            backgroundColor: C.accentGlow,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            color: C.title,
            fontSize: 22,
          }}
        >
          {t('userReviewsPage.deleteConfirmTitle')}
        </DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setReviewToDelete(null)}
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
            {t('userReviewsPage.deleteCancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            disableElevation
            onClick={handleDeleteConfirm}
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
                boxShadow: `0 6px 24px ${C.accentGlow}`,
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.18s ease',
            }}
          >
            {t('userReviewsPage.deleteConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
