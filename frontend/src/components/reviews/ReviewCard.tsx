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

type Review = {
  id: number;
  title?: string;
  content: string;
  rating?: { value: number };
  created_at?: string;
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

  const formattedDate = review.created_at
    ? new Date(review.created_at).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
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
        <Box>
          {review.rating?.value && (
            <Rating
              value={review.rating.value}
              readOnly
              size="small"
              sx={{ mb: 0.5 }}
            />
          )}
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

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ lineHeight: 1.6 }}
      >
        {review.content}
      </Typography>

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
