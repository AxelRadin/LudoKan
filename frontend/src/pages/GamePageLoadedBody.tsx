import {
  Box,
  Button,
  Chip,
  Tooltip,
  Typography,
  Skeleton,
} from '@mui/material';
import { useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import PlatformLogos from '../components/PlatformLogos';
import { SectionAccentTitle } from '../components/SectionAccentTitle';
import GameActions from '../components/GameActions';
import type { GamePageLogic } from '../hooks/useGamePageLogic';
import type { NormalizedGame } from '../types/game';
import type { GamePageAppearance } from './gamePageAppearance';
import { GAME_PAGE_FONT } from './gamePageAppearance';
import { GENRE_ICON_MAP } from './gamePageGenreIcons';
import { FavoriteGlyph } from './GamePageFragments';
import { buildPlayerLabel, fdate, hi } from './gamePageUtils';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';

const GameRatingsSummary = lazy(
  () => import('../components/GameRatingsSummary')
);
const ReviewSection = lazy(() => import('../components/reviews/ReviewSection'));
const GameGallerySection = lazy(
  () => import('../components/GameGallerySection')
);

const SectionSkeleton = () => (
  <Box sx={{ p: 3, mb: 2 }}>
    <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
    <Skeleton
      variant="rectangular"
      width="100%"
      height={200}
      sx={{ borderRadius: '16px' }}
    />
  </Box>
);

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

function getReviewGameId(djangoId: number | null | undefined): string {
  if (djangoId == null) return '';
  return String(djangoId);
}

function GameHeroCard({ game, logic, appearance }: PageSectionProps) {
  const { t } = useTranslation();
  const { accent, isDark } = appearance;
  const mainGenre = game.genres?.[0]?.name;
  const publisherName = game.publisher?.name;
  const releaseDate = game.release_date ? fdate(game.release_date) : null;
  const isFavorite = Boolean(logic.userGame?.is_favorite);
  const playerLabel = buildPlayerLabel(game.min_players, game.max_players);

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
        <Box sx={{ display: 'flex', gap: 0.8, flexWrap: 'wrap', mb: 1 }}>
          {mainGenre && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                px: 1.2,
                py: 0.35,
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

          {playerLabel && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.2,
                py: 0.35,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              <PeopleIcon sx={{ fontSize: 11, color: '#fff' }} />
              <Typography
                sx={{
                  fontFamily: GAME_PAGE_FONT,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: '#fff',
                }}
              >
                {playerLabel}
              </Typography>
            </Box>
          )}
        </Box>

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

export function GamePageLoadedBody({
  logic,
  appearance,
}: GamePageLoadedBodyProps) {
  const { t } = useTranslation();
  const game = logic.game as NormalizedGame;
  const { card, noHov, ink } = appearance;

  const description = buildDescriptionState(
    logic,
    game,
    t('gamePageBody.translating'),
    t('gamePageBody.descriptionEmpty')
  );
  const reviewGameId = getReviewGameId(logic.djangoId);
  const [reviewStarFilter, setReviewStarFilter] = useState<number | null>(null);

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
          <GameActions game={game} logic={logic} appearance={appearance} />
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
      <Box id="ratings-section">
        <Suspense fallback={<SectionSkeleton />}>
          <GameRatingsSummary
            game={game}
            gameApiId={logic.djangoId}
            appearance={appearance}
            reviewStarFilter={reviewStarFilter}
            onReviewStarFilterChange={setReviewStarFilter}
          />
        </Suspense>
      </Box>

      <Suspense fallback={<SectionSkeleton />}>
        <GameGallerySection game={game} logic={logic} appearance={appearance} />
      </Suspense>

      <Box
        id="reviews-section"
        sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' } }}
      >
        <Suspense fallback={<SectionSkeleton />}>
          <ReviewSection
            gameId={reviewGameId}
            resolveGameId={logic.ensureDjangoId}
            userReview={logic.userReview}
            currentUserId={logic.currentUserId}
            onReviewChange={review => {
              logic.setUserReview(review);
              void logic.refreshGame();
            }}
            reviewStarFilter={reviewStarFilter}
            onClearReviewStarFilter={() => setReviewStarFilter(null)}
          />
        </Suspense>
      </Box>
    </>
  );
}
