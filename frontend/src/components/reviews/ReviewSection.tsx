import { Box, Typography } from '@mui/material';
import { useState } from 'react';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';

type Review = {
  id: number;
  title?: string;
  content: string;
  rating?: { value: number };
  created_at?: string;
  user?: { id: number };
};

type ReviewSectionProps = Readonly<{
  gameId: string;
  userReview: Review | null;
  currentUserId: number | null;
  onReviewChange: (review: Review | null) => void;
}>;

export default function ReviewSection({
  gameId,
  userReview,
  currentUserId,
  onReviewChange,
}: ReviewSectionProps) {
  const [editingReview, setEditingReview] = useState<Review | null>(null);

  function handleEditSuccess(updated: {
    id: number;
    title?: string;
    content: string;
  }) {
    onReviewChange({ ...userReview, ...updated } as Review);
    setEditingReview(null);
  }

  function handleDeleteReview() {
    onReviewChange(null);
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}
      >
        Avis
      </Typography>

      {/* Formulaire ou avis publié */}
      {userReview && !editingReview ? (
        <ReviewCard
          review={userReview}
          isOwner={userReview.user?.id === currentUserId}
          onEdit={review => setEditingReview(review)}
          onDelete={handleDeleteReview}
        />
      ) : (
        <ReviewForm
          gameId={gameId}
          initialValues={
            editingReview
              ? { ...editingReview, rating: editingReview.rating?.value }
              : undefined
          }
          onSuccess={review => {
            if (editingReview) {
              handleEditSuccess(review);
            } else {
              onReviewChange(review as Review);
            }
          }}
          onCancel={editingReview ? () => setEditingReview(null) : undefined}
        />
      )}
    </Box>
  );
}
