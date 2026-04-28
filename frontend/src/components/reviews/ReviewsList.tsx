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
}: ReviewsListProps) {
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
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        {t('gamePageBody.reviewsCommunityHeading')}
      </Typography>

      {otherReviews.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.7, mb: 2 }}
        >
          {emptyMessage}
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
