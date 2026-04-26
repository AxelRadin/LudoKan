import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Box,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { t } from 'i18next';

const RATING_LABELS: Record<number, string> = {
  1: 'Mauvais',
  2: 'Médiocre',
  3: 'Correct',
  4: 'Bon',
  5: 'Excellent',
};

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

const StarIcon = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
    <path
      d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32L2.27 7.12l5.34-.78z"
      fill={filled ? 'rgb(255, 211, 211)' : 'none'}
      stroke={filled ? 'none' : '#C0C0C0'}
      strokeWidth={filled ? 0 : 1.2}
    />
  </svg>
);

const StarRating = ({ rating }: { rating: number }) => (
  <Box
    sx={{ display: 'flex', gap: '3px' }}
    aria-label={`${rating} étoiles sur 5`}
  >
    {Array.from({ length: 5 }, (_, i) => (
      <StarIcon key={i} filled={i < rating} />
    ))}
  </Box>
);

type Review = {
  id: number;
  rating_only?: boolean;
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
  const [hovered, setHovered] = useState(false);

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
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: '100%',
        bgcolor: '#fff',
        borderRadius: 3,
        mb: 2,
        ...(isOwner
          ? {
              border: '1px solid rgb(255, 211, 211)',
              animation: 'pulseGlow 3s ease-in-out infinite',
              '@keyframes pulseGlow': {
                '0%, 100%': {
                  boxShadow:
                    '0 0 5px 1px rgba(255,211,211,0.35), 0 0 12px 3px rgba(255,150,150,0.1)',
                },
                '50%': {
                  boxShadow:
                    '0 0 9px 3px rgba(255,211,211,0.6), 0 0 22px 6px rgba(255,100,100,0.18)',
                },
              },
            }
          : {
              border: '0.5px solid rgba(0,0,0,0.12)',
            }),
      }}
    >
      <Box sx={{ p: '1.25rem 1.5rem 1.5rem' }}>
        {/* En-tête */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Avatar */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: '#C41A1A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {getInitials(authorName)}
            </Box>

            {/* Infos utilisateur */}
            {/* ✅ Fix : alignItems: 'flex-start' force "6 avis publiés" à coller au bord gauche de la colonne */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '3px',
              }}
            >
              {/* Ligne 1 : username + badge */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'nowrap',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#111',
                    lineHeight: 1,
                  }}
                >
                  {authorName}
                </Typography>

                {isOwner && (
                  <Box
                    component="span"
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      bgcolor: '#FDE8E8',
                      color: '#A32D2D',
                      border: '0.5px solid #F09595',
                      borderRadius: '4px',
                      px: '8px',
                      py: '3px',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      display: 'inline-block',
                    }}
                  >
                    Mon avis
                  </Box>
                )}
              </Box>

              {/* Ligne 2 : "6 avis publiés" aligné à gauche sous le username */}
              {reviewCount !== null && (
                <Typography
                  variant="caption"
                  sx={{ color: '#888', fontSize: 11, lineHeight: 1 }}
                >
                  {reviewCount} avis publié{reviewCount > 1 ? 's' : ''}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Menu modifier/supprimer — pas pour une entrée « note seule » */}
          {isOwner && !review.rating_only && (
            <>
              <IconButton
                size="small"
                onClick={handleOpenMenu}
                sx={{ mt: 0.25 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    p: '2px',
                  }}
                >
                  {[0, 1, 2].map(i => (
                    <Box
                      key={i}
                      sx={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        bgcolor: '#888',
                      }}
                    />
                  ))}
                </Box>
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
                    if (!review.rating_only) onDelete(review.id);
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

        <Divider sx={{ mb: 2 }} />

        {/* Notation */}
        {ratingValue && (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}
          >
            <StarRating rating={ratingValue} />
            <Box
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                bgcolor: 'rgb(255, 211, 211)',
                color: '#A32D2D',
                borderRadius: '4px',
                px: '8px',
                py: '2px',
                lineHeight: 1.6,
              }}
            >
              {ratingValue} / 5
            </Box>
            <Typography
              variant="caption"
              sx={{ color: '#666', fontWeight: 500 }}
            >
              {RATING_LABELS[ratingValue]}
            </Typography>
          </Box>
        )}

        {/* Accent rouge à gauche au hover */}
        <Box
          sx={{
            borderLeft: `2px solid ${hovered ? '#C41A1A' : 'transparent'}`,
            pl: 1,
            ml: -1,
            transition: 'border-color 0.2s ease',
            textAlign: 'left',
          }}
        >
          {review.title && (
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                fontSize: 15,
                color: '#111',
                mb: 0.5,
                textAlign: 'left',
              }}
            >
              {review.title}
            </Typography>
          )}

          {review.content ? (
            <Typography
              variant="body2"
              sx={{
                color: '#555',
                lineHeight: 1.7,
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              {review.content}
            </Typography>
          ) : review.rating_only ? (
            <Typography
              variant="body2"
              sx={{
                color: '#888',
                fontStyle: 'italic',
                fontSize: 13,
                lineHeight: 1.7,
                textAlign: 'left',
              }}
            >
              {t('gamePageBody.reviewsRatingOnlyPlaceholder')}
            </Typography>
          ) : null}
        </Box>

        {formattedDate && (
          <Typography
            variant="caption"
            sx={{
              color: '#aaa',
              mt: 1.5,
              display: 'block',
              letterSpacing: '0.03em',
              textAlign: 'left',
            }}
          >
            {formattedDate}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
