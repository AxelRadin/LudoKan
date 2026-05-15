import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useCallback, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useRecommendations } from '../hooks/useRecommendations';
import type { NormalizedGame } from '../types/game';

const F = "'Outfit', sans-serif";
const C = {
  accent: '#c62828',
  darkAccent: '#ef5350',
  ink: '#241818',
  darkInk: '#f5e6e6',
  border: 'rgba(198,40,40,0.10)',
  darkBorder: 'rgba(239,83,80,0.12)',
};

function toAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

function toCoverBigUrl(url: string): string {
  return url
    .replace('/t_thumb/', '/t_cover_big/')
    .replace('/t_720p/', '/t_cover_big/');
}

function getScreenshots(game: NormalizedGame): string[] {
  const shots = (game.screenshots ?? [])
    .map(s => toAbsoluteUrl(s.url))
    .filter(Boolean)
    .slice(0, 4);
  if (shots.length >= 4) return shots;
  const fallback = toAbsoluteUrl(game.cover_url);
  while (shots.length < 4) shots.push(fallback);
  return shots;
}

interface FeaturedGameProps {
  readonly game: NormalizedGame;
}

function FeaturedGame({ game }: Readonly<FeaturedGameProps>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const accentColor = isDark ? C.darkAccent : C.accent;
  const inkColor = isDark ? C.darkInk : C.ink;
  const screenshots = getScreenshots(game);
  const coverUrl = toCoverBigUrl(toAbsoluteUrl(game.cover_url));
  const genres = game.genres ?? [];
  const screenshotOccurrences = new Map<string, number>();

  const handleClick = () => {
    if (game.django_id) navigate(`/game/${game.django_id}`);
    else if (game.igdb_id) navigate(`/game/igdb/${game.igdb_id}`);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        minHeight: { xs: 'auto', md: 400 },
        borderRadius: '20px',
        overflow: 'hidden',
        border: `1px solid ${isDark ? C.darkBorder : C.border}`,
        boxShadow: isDark
          ? '0 18px 40px rgba(0,0,0,0.28)'
          : '0 18px 40px rgba(198,40,40,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: isDark
            ? '0 24px 50px rgba(239,83,80,0.14)'
            : '0 24px 50px rgba(198,40,40,0.12)',
        },
      }}
      onClick={handleClick}
    >
      {/* Left — bannière avec fond flouté + cover centrée */}
      <Box
        sx={{
          position: 'relative',
          flex: { xs: 'none', md: '0 0 50%' },
          minHeight: { xs: 240, md: 400 },
          overflow: 'hidden',
          bgcolor: '#111',
        }}
      >
        {coverUrl && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${coverUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(22px) saturate(1.4) brightness(0.5)',
              transform: 'scale(1.1)',
            }}
          />
        )}
        {coverUrl && (
          <Box
            component="img"
            src={coverUrl}
            alt={game.name}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              height: '85%',
              maxWidth: '60%',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 45%)',
          }}
        />
        <Typography
          sx={{
            position: 'absolute',
            bottom: 18,
            left: 18,
            right: 18,
            fontFamily: F,
            fontWeight: 800,
            fontSize: { xs: 18, md: 22 },
            color: '#fff',
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            lineHeight: 1.2,
          }}
        >
          {game.name}
        </Typography>
      </Box>

      {/* Right — détails */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          p: { xs: 2, md: 2.5 },
          bgcolor: isDark ? 'rgba(40,20,20,0.72)' : 'rgba(255,255,255,0.82)',
        }}
      >
        <Typography
          sx={{
            fontFamily: F,
            fontWeight: 700,
            fontSize: { xs: 16, md: 18 },
            color: inkColor,
          }}
        >
          {game.name}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            flex: 1,
          }}
        >
          {screenshots.map(url => {
            const screenshotOccurrence =
              (screenshotOccurrences.get(url) ?? 0) + 1;
            screenshotOccurrences.set(url, screenshotOccurrence);
            const screenshotKey = `${url || 'fallback'}-${screenshotOccurrence}`;

            return (
              <Box
                key={screenshotKey}
                sx={{
                  borderRadius: '6px',
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  bgcolor: isDark ? '#1a0f0f' : '#f0e0e0',
                }}
              >
                {url ? (
                  <Box
                    component="img"
                    src={url}
                    alt={`screenshot-${screenshotOccurrence}`}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <Skeleton variant="rectangular" width="100%" height="100%" />
                )}
              </Box>
            );
          })}
        </Box>

        {genres.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            <Typography
              sx={{
                fontFamily: F,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
                color: isDark ? 'rgba(245,230,230,0.5)' : 'rgba(36,24,24,0.45)',
                textTransform: 'uppercase',
              }}
            >
              {t('recommendations.recommendedTags')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {genres.map(g => (
                <Chip
                  key={g.name}
                  label={t(`genres.${g.name}`, { defaultValue: g.name })}
                  size="small"
                  sx={{
                    fontFamily: F,
                    fontWeight: 600,
                    fontSize: 11,
                    bgcolor: accentColor,
                    color: '#fff',
                    height: 22,
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function RecommendedGamesSection() {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accentColor = isDark ? C.darkAccent : C.accent;
  const inkColor = isDark ? C.darkInk : C.ink;

  const { games, loading } = useRecommendations();
  const [index, setIndex] = useState(0);

  const prev = useCallback(
    () => setIndex(i => (i > 0 ? i - 1 : games.length - 1)),
    [games.length]
  );
  const next = useCallback(
    () => setIndex(i => (i < games.length - 1 ? i + 1 : 0)),
    [games.length]
  );

  const isEmpty = !loading && games.length === 0;
  const current = games[index] ?? null;

  let content: ReactElement;
  if (loading) {
    content = (
      <Skeleton
        variant="rectangular"
        width="100%"
        height={380}
        sx={{ borderRadius: '20px' }}
      />
    );
  } else if (isEmpty) {
    content = (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          py: 6,
          px: 3,
          borderRadius: '20px',
          border: `1px dashed ${isDark ? 'rgba(239,83,80,0.25)' : 'rgba(198,40,40,0.2)'}`,
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: F,
            fontSize: 15,
            color: inkColor,
            opacity: 0.6,
            maxWidth: 420,
          }}
        >
          {t('recommendations.noSuggestions')}
        </Typography>
        <Button
          href="/games"
          variant="contained"
          sx={{
            mt: 1,
            fontFamily: F,
            fontWeight: 700,
            bgcolor: accentColor,
            borderRadius: '12px',
            px: 3,
            '&:hover': { bgcolor: accentColor, opacity: 0.88 },
          }}
        >
          {t('recommendations.exploreCatalogue')}
        </Button>
      </Box>
    );
  } else {
    content = (
      <Box sx={{ position: 'relative' }}>
        {current && <FeaturedGame game={current} />}

        {games.length > 1 && (
          <>
            <IconButton
              aria-label={t('trendingGames.prevAriaLabel')}
              onClick={e => {
                e.stopPropagation();
                prev();
              }}
              sx={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 4,
                width: 42,
                height: 42,
                bgcolor: isDark ? 'rgba(42,32,32,0.95)' : 'common.white',
                backdropFilter: 'blur(12px)',
                color: isDark ? '#f5e6e6' : 'text.primary',
                border: '1px solid',
                borderColor: isDark ? 'rgba(74,48,48,0.6)' : 'grey.200',
                boxShadow: isDark
                  ? '0 4px 14px rgba(0,0,0,0.4)'
                  : '0 4px 14px rgba(0,0,0,0.12)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(50,30,30,1)' : 'common.white',
                  boxShadow: isDark
                    ? '0 6px 18px rgba(255,61,61,0.3)'
                    : '0 6px 18px rgba(0,0,0,0.18)',
                  transform: 'translateY(-50%) scale(1.05)',
                  color: isDark ? '#FF3D3D' : 'text.secondary',
                  borderColor: isDark ? 'rgba(255,61,61,0.4)' : 'grey.200',
                },
                '&:active': { transform: 'translateY(-50%) scale(0.98)' },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 24 }} />
            </IconButton>
            <IconButton
              aria-label={t('trendingGames.nextAriaLabel')}
              onClick={e => {
                e.stopPropagation();
                next();
              }}
              sx={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 4,
                width: 42,
                height: 42,
                bgcolor: isDark ? 'rgba(42,32,32,0.95)' : 'common.white',
                backdropFilter: 'blur(12px)',
                color: isDark ? '#f5e6e6' : 'text.primary',
                border: '1px solid',
                borderColor: isDark ? 'rgba(74,48,48,0.6)' : 'grey.200',
                boxShadow: isDark
                  ? '0 4px 14px rgba(0,0,0,0.4)'
                  : '0 4px 14px rgba(0,0,0,0.12)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: isDark ? 'rgba(50,30,30,1)' : 'common.white',
                  boxShadow: isDark
                    ? '0 6px 18px rgba(255,61,61,0.3)'
                    : '0 6px 18px rgba(0,0,0,0.18)',
                  transform: 'translateY(-50%) scale(1.05)',
                  color: isDark ? '#FF3D3D' : 'text.secondary',
                  borderColor: isDark ? 'rgba(255,61,61,0.4)' : 'grey.200',
                },
                '&:active': { transform: 'translateY(-50%) scale(0.98)' },
              }}
            >
              <ChevronRightIcon sx={{ fontSize: 24 }} />
            </IconButton>
          </>
        )}

        {games.length > 1 && (
          <Box
            sx={{ display: 'flex', justifyContent: 'center', gap: 0.75, mt: 2 }}
          >
            {games.map((game, i) => {
              const isActive = i === index;
              const gameKey = game.django_id
                ? `django-${game.django_id}`
                : `igdb-${game.igdb_id}`;
              let dotColor = isDark
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(0,0,0,0.15)';
              if (isActive) {
                dotColor = accentColor;
              }

              return (
                <Box
                  key={gameKey}
                  onClick={() => setIndex(i)}
                  sx={{
                    width: isActive ? 20 : 8,
                    height: 8,
                    borderRadius: '4px',
                    bgcolor: dotColor,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                />
              );
            })}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box data-tour="suggestions" sx={{ mb: 6 }}>
      <Box sx={{ mb: 3, pl: '18px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 18,
              height: '1px',
              background: accentColor,
              opacity: 0.6,
            }}
          />
          <Typography
            sx={{
              fontFamily: F,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: accentColor,
              opacity: 0.85,
            }}
          >
            {t('recommendations.personalised')}
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: F,
            fontWeight: 700,
            fontSize: { xs: 24, md: 32 },
            color: inkColor,
            letterSpacing: -0.3,
            lineHeight: 1.15,
          }}
        >
          {t('recommendations.suggestionsTitle')}
        </Typography>
      </Box>

      {content}
    </Box>
  );
}

export default RecommendedGamesSection;
