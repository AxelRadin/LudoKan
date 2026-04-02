import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Rating,
  Typography,
} from '@mui/material';
import { useState } from 'react';

const RATING_LABELS: Record<number, string> = {
  1: 'Mauvais',
  2: 'Médiocre',
  3: 'Correct',
  4: 'Bon',
  5: 'Excellent',
};

type Review = {
  id: number;
  title?: string;
  content: string;
  rating?: { value: number };
  created_at?: string;
  date_created?: string;
  user?: {
    id: number;
    pseudo?: string;
    username?: string;
    review_count?: number;
  };
};

type ReviewCardProps = Readonly<{
  review: Review;
  isOwner: boolean;
  onEdit: (review: Review) => void;
  onDelete: (reviewId: number) => void;
}>;

export default function ReviewCard({
  review,
  isOwner,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleCloseMenu = () => setAnchorEl(null);

  const dateStr = review.date_created ?? review.created_at;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const authorName = review.user?.pseudo ?? review.user?.username ?? 'Anonyme';
  const reviewCount = review.user?.review_count ?? null;
  const ratingValue = review.rating?.value
    ? Math.round(Number(review.rating.value))
    : null;

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: '#fff',
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        p: 2.5,
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Nom de l'utilisateur */}
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {authorName}
          </Typography>

          {/* Nombre d'avis */}
          {reviewCount !== null && (
            <Typography variant="caption" color="text.secondary">
              {reviewCount} avis publié{reviewCount > 1 ? 's' : ''}
            </Typography>
          )}

          {/* Label */}
          {ratingValue && (
            <Typography variant="caption" color="text.secondary">
              {RATING_LABELS[ratingValue]}
            </Typography>
          )}

          {/* Étoiles */}
          {ratingValue && (
            <Rating
              value={ratingValue}
              readOnly
              size="small"
              sx={{ marginLeft: '-2px' }}
            />
          )}

          {/* Titre */}
          {review.title && (
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {review.title}
            </Typography>
          )}
        </Box>

        {isOwner && (
          <>
            <IconButton size="small" onClick={handleOpenMenu}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
            >
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  onEdit(review);
                }}
              >
                <EditOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                Modifier
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  onDelete(review.id);
                }}
                sx={{ color: 'error.main' }}
              >
                <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                Supprimer
              </MenuItem>
            </Menu>
          </>
        )}
      </Box>

      <Divider sx={{ my: 1 }} />

      {/* Commentaire */}
      {review.content && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ lineHeight: 1.6 }}
        >
          {review.content}
        </Typography>
      )}

      {/* Date */}
      {formattedDate && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ mt: 1, display: 'block' }}
        >
          {formattedDate}
        </Typography>
      )}
    </Box>
  );
}
