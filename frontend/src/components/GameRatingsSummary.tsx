import { Box, Rating, Skeleton, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../services/api';
import type { NormalizedGame } from '../types/game';
import type { GamePageAppearance } from '../pages/gamePageAppearance';
import { SectionAccentTitle } from './SectionAccentTitle';
import { GAME_PAGE_FONT } from '../pages/gamePageAppearance';

type GameStatsRatings = Readonly<{
  average: number;
  count: number;
  distribution: Readonly<Record<string, number>>;
}>;

type GameStatsPayload = Readonly<{
  ratings: GameStatsRatings;
}>;

function averageOn10(game: NormalizedGame): number {
  return game.average_rating ?? game.rating_avg ?? 0;
}

function starsFromAverage10(avg10: number): number {
  return avg10 / 2;
}

function distributionTotal(dist: Readonly<Record<string, number>>): number {
  return Object.values(dist).reduce((a, b) => a + b, 0);
}

/** Affiche « 5 » plutôt que « 5.0 », conserve les demi-étoiles ex. « 4.5 ». */
function formatScoreOutOf5(n: number): string {
  const x = Math.round(n * 10) / 10;
  if (Math.abs(x - Math.round(x)) < 1e-6) return String(Math.round(x));
  return x.toFixed(1);
}

type GameRatingsSummaryProps = Readonly<{
  game: NormalizedGame;
  /** Django game id for `GET /api/games/:id/stats/`; histogram skipped if null */
  gameApiId: number | null;
  appearance: GamePageAppearance;
  /** Filtre avis communauté (1–5) ; re-clic sur la même ligne enlève le filtre */
  reviewStarFilter?: number | null;
  onReviewStarFilterChange?: (star: number | null) => void;
}>;

export default function GameRatingsSummary({
  game,
  gameApiId,
  appearance,
  reviewStarFilter = null,
  onReviewStarFilterChange,
}: GameRatingsSummaryProps) {
  const { t } = useTranslation();
  const { card, accent, accentSoft, ink, muted } = appearance;

  const ratingCount = game.rating_count ?? 0;
  const avg10 = averageOn10(game);
  const starsValue = starsFromAverage10(avg10);

  const [distribution, setDistribution] = useState<Record<
    string,
    number
  > | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (gameApiId == null || ratingCount === 0) {
      setDistribution(null);
      return;
    }

    const ac = new AbortController();
    setStatsLoading(true);
    apiGet(`/api/games/${gameApiId}/stats/`, { signal: ac.signal })
      .then((data: GameStatsPayload) => {
        const d = data?.ratings?.distribution;
        if (d && typeof d === 'object') setDistribution({ ...d });
        else setDistribution(null);
      })
      .catch(() => {
        setDistribution(null);
      })
      .finally(() => {
        if (!ac.signal.aborted) setStatsLoading(false);
      });

    return () => ac.abort();
  }, [gameApiId, ratingCount, avg10]);

  const maxBar = useMemo(() => {
    if (!distribution) return 0;
    return Math.max(1, ...Object.values(distribution));
  }, [distribution]);

  const showHistogram =
    distribution != null && distributionTotal(distribution) > 0;

  return (
    <Box className="gp-c4" sx={{ ...card(), px: 2.5, py: 2.5, mb: 2 }}>
      <SectionAccentTitle label={t('gamePageBody.communityRatingLabel')} />
      {ratingCount === 0 ? (
        <Typography
          variant="body2"
          sx={{
            fontFamily: GAME_PAGE_FONT,
            color: muted,
            mt: 1,
            lineHeight: 1.6,
          }}
        >
          {t('gamePageBody.ratingsBeFirst')}
        </Typography>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 2,
              mt: 1,
            }}
          >
            <Rating
              value={starsValue}
              readOnly
              precision={0.5}
              sx={{
                fontSize: 24,
                '& .MuiRating-iconFilled': { color: accent },
              }}
            />
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontWeight: 700,
                fontSize: 18,
                color: ink,
              }}
            >
              {t('gamePageBody.ratingsOutOfFive', {
                score: formatScoreOutOf5(starsValue),
              })}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: GAME_PAGE_FONT, color: muted }}
            >
              {t('gamePageBody.ratingsNotationCount', { count: ratingCount })}
            </Typography>
          </Box>

          {statsLoading ? (
            <Box sx={{ mt: 2.5 }}>
              <Skeleton variant="text" width="45%" height={20} />
              <Skeleton
                variant="rounded"
                width="100%"
                height={12}
                sx={{ mt: 1 }}
              />
              <Skeleton
                variant="rounded"
                width="100%"
                height={12}
                sx={{ mt: 1 }}
              />
              <Skeleton
                variant="rounded"
                width="100%"
                height={12}
                sx={{ mt: 1 }}
              />
            </Box>
          ) : showHistogram ? (
            <Box sx={{ mt: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: GAME_PAGE_FONT,
                  color: muted,
                  display: 'block',
                  mb: 0.5,
                  letterSpacing: 0.02,
                }}
              >
                {t('gamePageBody.ratingsDistributionTitle')}
              </Typography>
              {onReviewStarFilterChange ? (
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: GAME_PAGE_FONT,
                    color: muted,
                    display: 'block',
                    mb: 1.25,
                    opacity: 0.92,
                  }}
                >
                  {t('gamePageBody.ratingsHistogramFilterHint')}
                </Typography>
              ) : null}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {(['1', '2', '3', '4', '5'] as const).map(star => {
                  const n = distribution![star] ?? 0;
                  const pct = (n / maxBar) * 100;
                  const starNum = Number(star);
                  const isActive = reviewStarFilter === starNum;
                  const interactive = Boolean(onReviewStarFilterChange);
                  return (
                    <Box
                      key={star}
                      component={interactive ? 'button' : 'div'}
                      {...(interactive ? { type: 'button' as const } : {})}
                      onClick={
                        interactive
                          ? () =>
                              onReviewStarFilterChange!(
                                isActive ? null : starNum
                              )
                          : undefined
                      }
                      aria-pressed={interactive ? isActive : undefined}
                      aria-label={t('gamePageBody.ratingsFilterRowAria', {
                        stars: star,
                      })}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '22px 1fr 36px',
                        alignItems: 'center',
                        gap: 1,
                        ...(interactive
                          ? {
                              m: 0,
                              p: '6px 8px',
                              mx: -1,
                              border: 'none',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              font: 'inherit',
                              color: 'inherit',
                              bgcolor: isActive ? accentSoft : 'transparent',
                              transition:
                                'background-color 0.2s ease, box-shadow 0.2s ease',
                              '&:hover': {
                                bgcolor: isActive
                                  ? accentSoft
                                  : appearance.isDark
                                    ? 'rgba(255,255,255,0.06)'
                                    : 'rgba(0,0,0,0.04)',
                              },
                            }
                          : {}),
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: GAME_PAGE_FONT,
                          color: ink,
                          fontWeight: 600,
                        }}
                      >
                        {star}★
                      </Typography>
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 999,
                          bgcolor: appearance.isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            height: '100%',
                            width: `${pct}%`,
                            borderRadius: 999,
                            bgcolor: accent,
                            transition: 'width 0.35s ease',
                          }}
                        />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: GAME_PAGE_FONT,
                          color: muted,
                          textAlign: 'right',
                        }}
                      >
                        {n}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          ) : null}
        </>
      )}
    </Box>
  );
}
