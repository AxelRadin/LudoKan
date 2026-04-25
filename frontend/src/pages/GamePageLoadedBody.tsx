import BookmarkIcon from '@mui/icons-material/Bookmark';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import {
  Box,
  Button,
  Chip,
  Modal,
  Rating,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PlatformLogos from '../components/PlatformLogos';
import ReviewSection from '../components/reviews/ReviewSection';
import { SectionAccentTitle } from '../components/SectionAccentTitle';
import SecondaryButton from '../components/SecondaryButton';
import { AddToCollectionModal } from '../components/UserCollectionModals';
import { useAuth } from '../contexts/useAuth';
import type { GamePageLogic } from '../hooks/useGamePageLogic';
import type { NormalizedGame } from '../types/game';
import type { GamePageAppearance } from './gamePageAppearance';
import { GAME_PAGE_FONT } from './gamePageAppearance';
import { GENRE_ICON_MAP } from './gamePageGenreIcons';
import { Sep, StatusChip } from './GamePageFragments';
import { fdate, hi } from './gamePageUtils';

const DLIMIT = 220;

type GamePageLoadedBodyProps = Readonly<{
  logic: GamePageLogic;
  appearance: GamePageAppearance;
}>;
type PageSectionProps = Readonly<{
  game: NormalizedGame;
  logic: GamePageLogic;
  appearance: GamePageAppearance;
}>;
type DescriptionState = Readonly<{ displayText: string; isTruncated: boolean }>;
type DescriptionCardProps = Readonly<{
  logic: GamePageLogic;
  appearance: GamePageAppearance;
  description: DescriptionState;
}>;
type FavoriteGlyphProps = Readonly<{
  isFavorite: boolean;
  accent: string;
  size: number;
  color?: string;
}>;

function buildDescriptionState(
  logic: GamePageLogic,
  game: NormalizedGame,
  translatingText: string,
  emptyText: string
): DescriptionState {
  const fullText = logic.translating
    ? translatingText
    : (logic.translatedDesc ?? game.summary ?? emptyText);
  const isTruncated = !logic.translating && fullText.length > DLIMIT;
  const displayText =
    isTruncated && !logic.descExpanded
      ? `${fullText.slice(0, DLIMIT)}…`
      : fullText;
  return { displayText, isTruncated };
}

function getCommunityRating(game: NormalizedGame): number {
  return (game.average_rating ?? game.rating_avg ?? 0) / 2;
}

function getReviewGameId(djangoId: number | null | undefined): string {
  if (djangoId == null) return '';
  return String(djangoId);
}

function FavoriteGlyph({
  isFavorite,
  accent,
  size,
  color,
}: FavoriteGlyphProps) {
  if (isFavorite)
    return <FavoriteIcon sx={{ fontSize: size, color: color ?? accent }} />;
  return (
    <FavoriteBorderIcon
      sx={{ fontSize: size, color: color ?? 'rgba(255,255,255,0.9)' }}
    />
  );
}

function GameHeroCard({ game, logic, appearance }: PageSectionProps) {
  const { t } = useTranslation();
  const { accent, isDark } = appearance;
  const mainGenre = game.genres?.[0]?.name;
  const publisherName = game.publisher?.name;
  const releaseDate = game.release_date ? fdate(game.release_date) : null;
  const isFavorite = Boolean(logic.userGame?.is_favorite);

  return (
    <Box
      className="gp-img"
      sx={{
        position: 'relative',
        borderRadius: '24px',
        overflow: 'hidden',
        height: { xs: 380, md: '100%' },
        minHeight: { md: 520 },
        boxShadow: isDark
          ? '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(239,83,80,0.15)'
          : '0 24px 64px rgba(198,40,40,0.18)',
      }}
    >
      <Box
        component="img"
        src={hi(game.cover_url)}
        alt={game.name}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center top',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg,rgba(0,0,0,0) 35%,rgba(0,0,0,0.82) 100%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(135deg, rgba(198,40,40,0.12) 0%, transparent 50%)'
            : 'linear-gradient(135deg, rgba(198,40,40,0.08) 0%, transparent 50%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.15,
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
        }}
      />

      <Tooltip title={t('gamePageBody.favoriteTooltip')} arrow>
        <Box
          onClick={() => logic.handleToggleFavorite()}
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 4,
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(10,10,10,0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.18s ease, background 0.18s ease',
            '&:hover': {
              transform: 'scale(1.12)',
              background: 'rgba(10,10,10,0.75)',
            },
          }}
        >
          <FavoriteGlyph isFavorite={isFavorite} accent={accent} size={17} />
        </Box>
      </Tooltip>

      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: '20px 22px 24px',
        }}
      >
        {mainGenre && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1.2,
              py: 0.35,
              mb: 1,
              borderRadius: 999,
              background: `${accent}22`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${accent}40`,
            }}
          >
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.8,
                textTransform: 'uppercase',
                color: '#fff',
              }}
            >
              {mainGenre}
            </Typography>
          </Box>
        )}
        <Typography
          sx={{
            fontFamily: GAME_PAGE_FONT,
            fontWeight: 800,
            fontSize: { xs: 22, md: 26 },
            color: '#fff',
            lineHeight: 1.1,
            letterSpacing: -0.3,
            textShadow: '0 2px 18px rgba(0,0,0,0.7)',
            mb: 0.6,
          }}
        >
          {game.name}
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          {publisherName && (
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontSize: 12,
                color: 'rgba(255,255,255,0.75)',
                fontWeight: 500,
              }}
            >
              {publisherName}
            </Typography>
          )}
          {releaseDate && (
            <>
              <Box
                sx={{
                  width: 3,
                  height: 3,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.4)',
                }}
              />
              <Typography
                sx={{
                  fontFamily: GAME_PAGE_FONT,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                {releaseDate}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function GameActionsCard({ game: _game, logic, appearance }: PageSectionProps) {
  const { t } = useTranslation();
  const { card, redBtnSx, accent, muted } = appearance;
  const isFavorite = Boolean(logic.userGame?.is_favorite);
  const { isAuthenticated, setAuthModalOpen, setPendingAction } = useAuth();
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const openCollectionModal = () => setCollectionModalOpen(true);

  const requireAuthForCollection = () => {
    setPendingAction(() => () => setCollectionModalOpen(true));
    setAuthModalOpen(true);
  };

  const onAddToCollectionClick = () => {
    if (!isAuthenticated) {
      requireAuthForCollection();
      return;
    }
    openCollectionModal();
  };

  return (
    <Box className="gp-c0" sx={{ ...card(), px: 2.5, py: 2.5 }}>
      <SectionAccentTitle label={t('gamePageBody.actionsLabel')} />
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}>
        <SecondaryButton
          onClick={() => logic.handleSetMatchmaking()}
          disabled={logic.isMatching}
        >
          {logic.isMatching
            ? t('gamePageBody.searching')
            : t('gamePageBody.matchmaking')}
        </SecondaryButton>
        <Button
          variant="contained"
          onClick={onAddToCollectionClick}
          sx={redBtnSx}
        >
          {t('gamePageBody.addToCollection')}
        </Button>
      </Box>

      <AddToCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        djangoGameId={logic.djangoId}
        ensureDjangoId={logic.ensureDjangoId}
        isAuthenticated={isAuthenticated}
        onRequireAuth={requireAuthForCollection}
        userGameHint={logic.userGame}
        onApplied={logic.refreshUserLibrary}
      />

      <Sep />

      <SectionAccentTitle label={t('gamePageBody.statusLabel')} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
        <StatusChip
          icon={<CheckCircleIcon />}
          label={t('gamePageBody.statusDone')}
          active={logic.userGame?.status === 'TERMINE'}
          color="#43a047"
          onClick={() => logic.handleSetStatus('TERMINE')}
        />
        <StatusChip
          icon={<PlayCircleIcon />}
          label={t('gamePageBody.statusPlaying')}
          active={logic.userGame?.status === 'EN_COURS'}
          color={accent}
          onClick={() => logic.handleSetStatus('EN_COURS')}
        />
        <StatusChip
          icon={<BookmarkIcon />}
          label={t('gamePageBody.statusWishlist')}
          active={logic.userGame?.status === 'ENVIE_DE_JOUER'}
          color="#fb8c00"
          onClick={() => logic.handleSetStatus('ENVIE_DE_JOUER')}
        />

        <Tooltip title={t('gamePageBody.favoriteTooltip')} arrow>
          <Box
            onClick={() => logic.handleToggleFavorite()}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              px: 1.5,
              py: 0.7,
              borderRadius: '12px',
              cursor: 'pointer',
              background: isFavorite
                ? 'rgba(255,61,61,0.12)'
                : 'rgba(0,0,0,0.03)',
              border: isFavorite
                ? '1px solid rgba(255,61,61,0.35)'
                : '1px solid rgba(0,0,0,0.06)',
              color: isFavorite ? accent : muted,
              transition: 'all 0.18s ease',
              '&:hover': {
                background: 'rgba(255,61,61,0.10)',
                color: accent,
                transform: 'translateY(-1px)',
              },
            }}
          >
            <FavoriteGlyph
              isFavorite={isFavorite}
              accent={accent}
              size={14}
              color="inherit"
            />
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontSize: 12.5,
                fontWeight: isFavorite ? 700 : 500,
                color: 'inherit',
              }}
            >
              {t('gamePageBody.favorite')}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}

function GameGenresCard({ game, appearance }: PageSectionProps) {
  const { t } = useTranslation();
  const { card, accent, muted, accentSoft, accentGlow } = appearance;
  const genres = game.genres ?? [];

  return (
    <Box className="gp-c2" sx={{ ...card(), px: 2.5, py: 2.5 }}>
      <SectionAccentTitle label={t('gamePageBody.genresLabel')} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
        {genres.length > 0 ? (
          genres.map((g: { name: string }) => (
            <Chip
              key={g.name}
              label={g.name}
              size="small"
              icon={GENRE_ICON_MAP[g.name]}
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontWeight: 600,
                fontSize: 11.5,
                backgroundColor: accentSoft,
                border: `1px solid ${accentGlow}`,
                color: accent,
                borderRadius: '10px',
                '& .MuiChip-icon': { color: accent },
                transition: 'transform 0.15s ease',
                '&:hover': { transform: 'translateY(-1px)' },
              }}
            />
          ))
        ) : (
          <Typography
            sx={{ fontFamily: GAME_PAGE_FONT, fontSize: 13, color: muted }}
          >
            {t('gamePageBody.genresEmpty')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function GameDescriptionCard({
  logic,
  appearance,
  description,
}: DescriptionCardProps) {
  const { t } = useTranslation();
  const { card, accent, ink, muted } = appearance;

  return (
    <Box className="gp-c3" sx={{ ...card(), px: 2.5, py: 2.5, flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <DescriptionIcon sx={{ color: accent, fontSize: 16 }} />
        <Typography
          sx={{
            fontFamily: GAME_PAGE_FONT,
            fontWeight: 700,
            fontSize: 15,
            color: ink,
            letterSpacing: -0.2,
          }}
        >
          {t('gamePageBody.descriptionLabel')}
        </Typography>
      </Box>
      <Typography
        sx={{
          fontFamily: GAME_PAGE_FONT,
          fontSize: 13.5,
          lineHeight: 1.85,
          color: logic.translating ? muted : ink,
        }}
      >
        {description.displayText}
      </Typography>
      {description.isTruncated && (
        <Button
          size="small"
          onClick={() => logic.setDescExpanded(p => !p)}
          sx={{
            mt: 1,
            p: 0,
            textTransform: 'none',
            fontFamily: GAME_PAGE_FONT,
            fontWeight: 600,
            color: accent,
            fontSize: 12,
          }}
        >
          {logic.descExpanded
            ? t('gamePageBody.showLess')
            : t('gamePageBody.showMore')}
        </Button>
      )}
    </Box>
  );
}

function GameGallerySection({ game, logic, appearance }: PageSectionProps) {
  const { t } = useTranslation();
  const { card, noHov, accentGlow, ink } = appearance;
  const videos = game.videos ?? [];
  const screenshots = game.screenshots ?? [];

  if (videos.length === 0 && screenshots.length === 0) return null;

  return (
    <Box
      className="gp-c5"
      sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' }, mb: 2 }}
    >
      <SectionAccentTitle label={t('gamePageBody.galleryLabel')} />
      <Typography
        sx={{
          fontFamily: GAME_PAGE_FONT,
          fontWeight: 700,
          fontSize: 18,
          color: ink,
          letterSpacing: -0.3,
          mb: 0.5,
        }}
      >
        {t('gamePageBody.mediaLabel')}
      </Typography>
      <Sep />

      {videos.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: '16/9',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: `0 8px 28px rgba(0,0,0,0.14), 0 0 0 1px ${accentGlow}`,
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videos[0].video_id}`}
              title={videos[0].name || 'Trailer'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </Box>
        </Box>
      )}

      {screenshots.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 99,
              bgcolor: accentGlow,
            },
          }}
        >
          {screenshots.map(s => (
            <Box
              key={s.url}
              component="img"
              src={s.url}
              alt={
                game.name
                  ? t('gamePageBody.screenshotAlt', { name: game.name })
                  : t('gamePageBody.screenshotAltFallback')
              }
              onClick={() => logic.setSelectedShot(s.url)}
              sx={{
                height: { xs: 130, sm: 185 },
                minWidth: { xs: 200, sm: 295 },
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: `0 3px 10px rgba(0,0,0,0.08), 0 0 0 1px ${accentGlow}`,
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 8px 24px rgba(198,40,40,0.15)',
                },
              }}
            />
          ))}
        </Box>
      )}

      {logic.selectedShot && (
        <Modal open onClose={() => logic.setSelectedShot(null)}>
          <Box
            onClick={() => logic.setSelectedShot(null)}
            sx={{
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(14px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <Box
              component="img"
              src={logic.selectedShot}
              alt={t('gamePageBody.screenshotEnlarged')}
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '16px',
                boxShadow: '0 28px 80px rgba(0,0,0,0.6)',
              }}
            />
          </Box>
        </Modal>
      )}
    </Box>
  );
}

export function GamePageLoadedBody({
  logic,
  appearance,
}: GamePageLoadedBodyProps) {
  const { t } = useTranslation();
  const game = logic.game as NormalizedGame;
  const { card, noHov, accent, ink } = appearance;

  const description = buildDescriptionState(
    logic,
    game,
    t('gamePageBody.translating'),
    t('gamePageBody.descriptionEmpty')
  );
  const communityRating = getCommunityRating(game);
  const reviewGameId = getReviewGameId(logic.djangoId);

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '340px 1fr' },
          gap: 2.5,
          mb: 2.5,
          alignItems: 'stretch',
        }}
      >
        <GameHeroCard game={game} logic={logic} appearance={appearance} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <GameActionsCard game={game} logic={logic} appearance={appearance} />
          <Box className="gp-c1" sx={{ ...card(), px: 2.5, py: 2.5 }}>
            <SectionAccentTitle label={t('gamePageBody.platformsLabel')} />
            <PlatformLogos platforms={game.platforms ?? []} />
          </Box>
          <GameGenresCard game={game} logic={logic} appearance={appearance} />
          <GameDescriptionCard
            logic={logic}
            appearance={appearance}
            description={description}
          />
        </Box>
      </Box>

      <Box className="gp-c4" sx={{ ...card(), px: 3, py: 2.5, mb: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
          <Box>
            <SectionAccentTitle label={t('gamePageBody.releaseLabel')} />
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontWeight: 700,
                fontSize: 16,
                color: ink,
              }}
            >
              {fdate(game.release_date) || 'N/A'}
            </Typography>
          </Box>
          <Box>
            <SectionAccentTitle label={t('gamePageBody.publisherLabel')} />
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontWeight: 700,
                fontSize: 16,
                color: ink,
              }}
            >
              {game.publisher?.name || 'N/A'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box className="gp-c4" sx={{ ...card(), px: 3, py: 2.5, mb: 2 }}>
        <SectionAccentTitle label={t('gamePageBody.communityRatingLabel')} />
        <Rating
          value={communityRating}
          readOnly
          precision={0.5}
          sx={{
            fontSize: 24,
            mt: 0.5,
            '& .MuiRating-iconFilled': { color: accent },
          }}
        />
      </Box>

      <GameGallerySection game={game} logic={logic} appearance={appearance} />

      <Box sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' } }}>
        <ReviewSection
          gameId={reviewGameId}
          resolveGameId={logic.ensureDjangoId}
          userReview={logic.userReview}
          currentUserId={logic.currentUserId}
          onReviewChange={review => logic.setUserReview(review)}
        />
      </Box>
    </>
  );
}
