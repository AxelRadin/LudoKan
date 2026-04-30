import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Typography,
} from '@mui/material';
import { t } from 'i18next';
import type { ReviewItem } from '../../hooks/useReviews';
import ReviewCard from './ReviewCard';

type ReviewsListProps = Readonly<{
  otherReviews: ReviewItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  hasNext: boolean;
  onLoadMore: () => void;
  currentUserId: number | null;
  onEditReview: (review: ReviewItem) => void;
  onDeleteReview: (reviewId: number) => void;
  /** 1–5 : n’affiche que les avis avec cette note (étoiles entières) */
  reviewStarFilter?: number | null;
  onClearReviewStarFilter?: () => void;
}>;

export default function ReviewsList({
  otherReviews,
  totalCount,
  isLoading,
  isLoadingMore,
  error,
  loadMoreError,
  hasNext,
  onLoadMore,
  currentUserId,
  onEditReview,
  onDeleteReview,
  reviewStarFilter = null,
  onClearReviewStarFilter,
}: ReviewsListProps) {
  const hasStarFilter = reviewStarFilter != null;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography
        variant="body2"
        color="error"
        sx={{ textAlign: 'center', py: 2 }}
      >
        {error}
      </Typography>
    );
  }

  const emptyMessage =
    totalCount === 0
      ? t('gamePageBody.reviewsBeFirst')
      : t('gamePageBody.reviewsNoOthersYet');

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Divider sx={{ mb: 3 }} />
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, m: 0 }}>
          {t('gamePageBody.reviewsCommunityHeading')}
        </Typography>
        {hasStarFilter && onClearReviewStarFilter ? (
          <Button
            variant="outlined"
            size="small"
            onClick={onClearReviewStarFilter}
            sx={{ textTransform: 'none', flexShrink: 0 }}
          >
            {t('gamePageBody.reviewsClearStarFilter')}
          </Button>
        ) : null}
      </Box>

      {hasStarFilter ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6, mb: 2 }}
        >
          {t('gamePageBody.reviewsFilteredBanner', {
            stars: reviewStarFilter,
          })}
        </Typography>
      ) : null}

      {otherReviews.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.7, mb: 2 }}
        >
          {hasStarFilter
            ? t('gamePageBody.reviewsFilteredEmpty')
            : emptyMessage}
        </Typography>
      ) : (
        <>
          {otherReviews.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              isOwner={review.user?.id === currentUserId}
              onEdit={onEditReview}
              onDelete={onDeleteReview}
            />
          ))}
          {hasNext && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1,
                mt: 2,
              }}
            >
              <Button
                variant="outlined"
                size="small"
                onClick={onLoadMore}
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
              {loadMoreError && (
                <Typography variant="caption" color="error">
                  {loadMoreError}
                </Typography>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
