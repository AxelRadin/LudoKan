import { Box, CircularProgress, Divider, Typography } from '@mui/material';
import { useReviews } from '../../hooks/useReviews';
import ReviewCard from './ReviewCard';

type ReviewsListProps = Readonly<{
  gameId: string | null;
  currentUserId: number | null;
  userReviewId: number | null;
  onEditReview: (review: any) => void;
  onDeleteReview: (reviewId: number) => void;
}>;

export default function ReviewsList({
  gameId,
  currentUserId,
  userReviewId,
  onEditReview,
  onDeleteReview,
}: ReviewsListProps) {
  const { reviews, isLoading, error } = useReviews(gameId);

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

  if (reviews.length === 0) {
    return (
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: 'center', py: 2 }}
      >
        Soyez le premier à donner votre avis !
      </Typography>
    );
  }

  const otherReviews = reviews.filter(r => r.id !== userReviewId);

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
