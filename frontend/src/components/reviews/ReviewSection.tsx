import { Box, Button, Dialog, DialogActions, DialogTitle } from '@mui/material';
import { useCallback, useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { apiDelete } from '../../services/api';
import { useReviews } from '../../hooks/useReviews';
import { SectionAccentTitle } from '../SectionAccentTitle';
import ReviewCard from './ReviewCard';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';

const F = "'Outfit', sans-serif";

export type Review = {
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

async function deleteReviewOnServer(
  reviewId: number,
  userReview: Review | null,
  onReviewChange: (review: Review | null) => void,
  removeReview: (id: number) => void
): Promise<void> {
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

type UserReviewEditorProps = Readonly<{
  gameId: string;
  resolveGameId?: () => Promise<string | number | null>;
  userReview: Review | null;
  editingReview: Review | null;
  currentUserId: number | null;
  onEditingChange: (review: Review | null) => void;
  onDeleteRequest: (id: number) => void;
  onUserReviewChange: (review: Review | null) => void;
  updateReview: (review: Review) => void;
  addReview: (review: Review) => void;
}>;

function UserReviewEditor({
  gameId,
  resolveGameId,
  userReview,
  editingReview,
  currentUserId,
  onEditingChange,
  onDeleteRequest,
  onUserReviewChange,
  updateReview,
  addReview,
}: UserReviewEditorProps) {
  const showExistingCard = Boolean(userReview && !editingReview);

  function handleEditSuccess(updated: Review) {
    onUserReviewChange({ ...userReview, ...updated } as Review);
    updateReview({ ...userReview, ...updated } as Review);
    onEditingChange(null);
  }

  function handleReviewCreated(review: Review) {
    onUserReviewChange(review);
    addReview(review);
  }

  function handleFormSuccess(review: Review) {
    if (editingReview) {
      handleEditSuccess(review);
      return;
    }
    handleReviewCreated(review);
  }

  if (showExistingCard && userReview) {
    return (
      <ReviewCard
        review={userReview}
        isOwner={userReview.user?.id === currentUserId}
        onEdit={review => onEditingChange(review as Review)}
        onDelete={onDeleteRequest}
      />
    );
  }

  return (
    <ReviewForm
      gameId={gameId}
      resolveGameId={resolveGameId}
      initialValues={
        editingReview
          ? { ...editingReview, rating: editingReview.rating?.value }
          : undefined
      }
      onSuccess={review => handleFormSuccess(review as Review)}
      onCancel={editingReview ? () => onEditingChange(null) : undefined}
    />
  );
}

type DeleteReviewDialogProps = Readonly<{
  open: boolean;
  isDark: boolean;
  accent: string;
  ink: string;
  cardBorder: string;
  onDismiss: () => void;
  onConfirm: () => void;
}>;

function DeleteReviewDialog({
  open,
  isDark,
  accent,
  ink,
  cardBorder,
  onDismiss,
  onConfirm,
}: DeleteReviewDialogProps) {
  const paperBg = isDark ? 'rgba(40,20,20,0.95)' : 'rgba(255,255,255,0.95)';
  const paperShadow = isDark
    ? '0 24px 64px rgba(0,0,0,0.5)'
    : '0 24px 64px rgba(198,40,40,0.12)';
  const cancelHoverBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <Dialog
      open={open}
      onClose={onDismiss}
      PaperProps={{
        sx: {
          borderRadius: '16px',
          background: paperBg,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${cardBorder}`,
          boxShadow: paperShadow,
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
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, justifyContent: 'center' }}>
        <Button
          size="small"
          onClick={onDismiss}
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
              background: cancelHoverBg,
            },
          }}
        >
          Annuler
        </Button>
        <Button
          size="small"
          onClick={onConfirm}
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
  );
}

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
  const cardBorder = isDark ? 'rgba(239,83,80,0.14)' : 'rgba(198,40,40,0.10)';

  const confirmDeleteReview = useCallback(async () => {
    if (reviewToDelete === null) return;
    const id = reviewToDelete;
    await deleteReviewOnServer(id, userReview, onReviewChange, removeReview);
    setReviewToDelete(null);
  }, [reviewToDelete, userReview, onReviewChange, removeReview]);

  const otherReviews = reviews.filter(r => r.id !== userReview?.id);

  return (
    <Box sx={{ width: '100%' }}>
      <SectionAccentTitle label="Votre avis eededee" marginBottom={3} />
      <UserReviewEditor
        gameId={gameId}
        resolveGameId={resolveGameId}
        userReview={userReview}
        editingReview={editingReview}
        currentUserId={currentUserId}
        onEditingChange={setEditingReview}
        onDeleteRequest={setReviewToDelete}
        onUserReviewChange={onReviewChange}
        updateReview={updateReview}
        addReview={addReview}
      />

      {otherReviews.length > 0 && <SectionAccentTitle label="Autres avis" />}

      <ReviewsList
        otherReviews={otherReviews}
        isLoading={isLoading}
        error={error}
        currentUserId={currentUserId}
        onEditReview={review => setEditingReview(review as Review)}
        onDeleteReview={setReviewToDelete}
      />

      <DeleteReviewDialog
        open={reviewToDelete !== null}
        isDark={isDark}
        accent={accent}
        ink={ink}
        cardBorder={cardBorder}
        onDismiss={() => setReviewToDelete(null)}
        onConfirm={confirmDeleteReview}
      />
    </Box>
  );
}
