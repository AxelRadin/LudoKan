import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import { apiDelete } from '../../services/api';
import { useReviews } from '../../hooks/useReviews';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';

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
  const { reviews, isLoading, error, addReview, updateReview, removeReview } =
    useReviews(gameId || null);

  async function handleDeleteReview(reviewId: number) {
    try {
      await apiDelete(`/api/reviews/${reviewId}/`);
      if (userReview?.id === reviewId) {
        onReviewChange(null);
      }
      removeReview(reviewId);
    } catch {
      alert("Erreur lors de la suppression de l'avis.");
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
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}
      >
        Avis
      </Typography>

      {userReview && !editingReview ? (
        <ReviewCard
          review={userReview}
          isOwner={userReview.user?.id === currentUserId}
          onEdit={review => setEditingReview(review as Review)}
          onDelete={handleDeleteReview}
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

      <ReviewsList
        otherReviews={otherReviews}
        isLoading={isLoading}
        error={error}
        currentUserId={currentUserId}
        onEditReview={review => setEditingReview(review as Review)}
        onDeleteReview={handleDeleteReview}
      />
    </Box>
  );
}
