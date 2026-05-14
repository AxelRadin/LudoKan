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
import { useState, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
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

// Hook pour obtenir les couleurs dynamiques basées sur le thème
function useThemeColors() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return useMemo(() => {
    const common = {
      accent: '#FF3D3D',
      accentDark: '#b71c1c',
      avatarBg: '#C41A1A',
      hoverBorder: '#C41A1A',
      isDark,
    };

    if (isDark) {
      return {
        ...common,
        cardBg: 'rgba(42,32,32,0.78)',
        border: 'rgba(74,48,48,0.9)',
        ownerBorder: 'rgba(255,100,100,0.4)',
        title: '#f5e6e6',
        text: '#e0d0d0',
        textLight: '#b49393',
        textVeryLight: '#9e7070',
        muted: '#9e7070',
        badgeBg: 'rgba(255,61,61,0.15)',
        badgeText: '#ff8a80',
        badgeBorder: 'rgba(255,61,61,0.3)',
        starFilled: 'rgb(255, 180, 180)',
        starEmpty: '#9e7070',
        divider: 'rgba(74,48,48,0.5)',
        dotsBg: '#b49393',
        menuBg: 'rgba(42,32,32,0.96)',
      };
    }

    return {
      ...common,
      cardBg: '#fff',
      border: 'rgba(0,0,0,0.12)',
      ownerBorder: 'rgb(255, 211, 211)',
      title: '#111',
      text: '#555',
      textLight: '#888',
      textVeryLight: '#aaa',
      muted: '#666',
      badgeBg: '#FDE8E8',
      badgeText: '#A32D2D',
      badgeBorder: '#F09595',
      starFilled: 'rgb(255, 211, 211)',
      starEmpty: '#C0C0C0',
      divider: 'rgba(0,0,0,0.12)',
      dotsBg: '#888',
      menuBg: '#fff',
    };
  }, [isDark]);
}

const StarIcon = ({
  filled,
  starFilled,
  starEmpty,
}: {
  filled: boolean;
  starFilled: string;
  starEmpty: string;
}) => (
  <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true">
    <path
      d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32L2.27 7.12l5.34-.78z"
      fill={filled ? starFilled : 'none'}
      stroke={filled ? 'none' : starEmpty}
      strokeWidth={filled ? 0 : 1.2}
    />
  </svg>
);

const StarRating = ({
  rating,
  starFilled,
  starEmpty,
}: {
  rating: number;
  starFilled: string;
  starEmpty: string;
}) => (
  <Box
    sx={{ display: 'flex', gap: '3px' }}
    aria-label={`${rating} étoiles sur 5`}
  >
    {Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        filled={i < rating}
        starFilled={starFilled}
        starEmpty={starEmpty}
      />
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
  const C = useThemeColors();
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
  const authorPseudo = review.user?.pseudo;
  const reviewCount = review.user?.review_count ?? null;
  const ratingValue = review.rating?.value
    ? Math.round(Number(review.rating.value))
    : null;

  let reviewBody: ReactNode = null;
  if (review.content) {
    reviewBody = (
      <Typography
        variant="body2"
        sx={{
          color: C.text,
          lineHeight: 1.7,
          fontSize: 13,
          textAlign: 'left',
        }}
      >
        {review.content}
      </Typography>
    );
  } else if (review.rating_only) {
    reviewBody = (
      <Typography
        variant="body2"
        sx={{
          color: C.textLight,
          fontStyle: 'italic',
          fontSize: 13,
          lineHeight: 1.7,
          textAlign: 'left',
        }}
      >
        {t('gamePageBody.reviewsRatingOnlyPlaceholder')}
      </Typography>
    );
  }

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        width: '100%',
        bgcolor: C.cardBg,
        backdropFilter: 'blur(10px)',
        borderRadius: 3,
        mb: 2,
        ...(isOwner
          ? {
              border: `1px solid ${C.ownerBorder}`,
              animation: 'pulseGlow 3s ease-in-out infinite',
              '@keyframes pulseGlow': {
                '0%, 100%': {
                  boxShadow: C.isDark
                    ? '0 0 5px 1px rgba(255,61,61,0.25), 0 0 12px 3px rgba(255,61,61,0.1)'
                    : '0 0 5px 1px rgba(255,211,211,0.35), 0 0 12px 3px rgba(255,150,150,0.1)',
                },
                '50%': {
                  boxShadow: C.isDark
                    ? '0 0 9px 3px rgba(255,61,61,0.45), 0 0 22px 6px rgba(255,61,61,0.15)'
                    : '0 0 9px 3px rgba(255,211,211,0.6), 0 0 22px 6px rgba(255,100,100,0.18)',
                },
              },
            }
          : {
              border: `0.5px solid ${C.border}`,
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
                bgcolor: C.avatarBg,
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
                {authorPseudo ? (
                  <Typography
                    variant="body2"
                    component={Link}
                    to={`/u/${encodeURIComponent(authorPseudo)}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: C.title,
                      lineHeight: 1,
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: C.accent,
                      },
                    }}
                  >
                    {authorName}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: C.title,
                      lineHeight: 1,
                    }}
                  >
                    {authorName}
                  </Typography>
                )}

                {isOwner && (
                  <Box
                    component="span"
                    sx={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      bgcolor: C.badgeBg,
                      color: C.badgeText,
                      border: `0.5px solid ${C.badgeBorder}`,
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
                  sx={{ color: C.textLight, fontSize: 11, lineHeight: 1 }}
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
                        bgcolor: C.dotsBg,
                      }}
                    />
                  ))}
                </Box>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                PaperProps={{
                  sx: {
                    bgcolor: C.menuBg,
                    backdropFilter: 'blur(20px)',
                    borderRadius: '12px',
                    border: `1px solid ${C.border}`,
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    onEdit(review);
                  }}
                  sx={{
                    color: C.title,
                    '&:hover': {
                      bgcolor: C.isDark
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.04)',
                    },
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
                  sx={{
                    color: C.accent,
                    '&:hover': {
                      bgcolor: C.isDark
                        ? 'rgba(255,61,61,0.1)'
                        : 'rgba(211,47,47,0.08)',
                    },
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                  Supprimer
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        <Divider sx={{ mb: 2, borderColor: C.divider }} />

        {/* Notation */}
        {ratingValue && (
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}
          >
            <StarRating
              rating={ratingValue}
              starFilled={C.starFilled}
              starEmpty={C.starEmpty}
            />
            <Box
              sx={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                bgcolor: C.badgeBg,
                color: C.badgeText,
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
              sx={{ color: C.muted, fontWeight: 500 }}
            >
              {RATING_LABELS[ratingValue]}
            </Typography>
          </Box>
        )}

        {/* Accent rouge à gauche au hover */}
        <Box
          sx={{
            borderLeft: `2px solid ${hovered ? C.hoverBorder : 'transparent'}`,
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
                color: C.title,
                mb: 0.5,
                textAlign: 'left',
              }}
            >
              {review.title}
            </Typography>
          )}

          {reviewBody}
        </Box>

        {formattedDate && (
          <Typography
            variant="caption"
            sx={{
              color: C.textVeryLight,
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
