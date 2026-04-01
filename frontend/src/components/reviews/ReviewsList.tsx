import { Box, CircularProgress, Divider, Typography } from '@mui/material';
import { ReviewItem } from '../../hooks/useReviews';
import ReviewCard from './ReviewCard';

type ReviewsListProps = Readonly<{
  otherReviews: ReviewItem[];
  isLoading: boolean;
  error: string | null;
  currentUserId: number | null;
  onEditReview: (review: ReviewItem) => void;
  onDeleteReview: (reviewId: number) => void;
}>;

export default function ReviewsList({
  otherReviews,
  isLoading,
  error,
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

  if (otherReviews.length === 0) return null;

  return (
    <Box sx={{ width: '100%', mt: 3 }}>
      <Divider sx={{ mb: 3 }} />
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Avis de la communauté
      </Typography>
      {otherReviews.map(review => (
        <ReviewCard
          key={review.id}
          review={review}
          isOwner={review.user?.id === currentUserId}
          onEdit={onEditReview}
          onDelete={onDeleteReview}
        />
      ))}
    </Box>
  );
}
