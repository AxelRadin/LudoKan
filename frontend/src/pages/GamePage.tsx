import BookmarkIcon from '@mui/icons-material/Bookmark';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CategoryIcon from '@mui/icons-material/Category';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import DevicesIcon from '@mui/icons-material/Devices';
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
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchIgdbGameById,
  resolveGameIdIfNeeded,
  translateDescription,
} from '../api/igdb';
import PlatformLogos from '../components/PlatformLogos';
import ReviewSection from '../components/reviews/ReviewSection';
import SecondaryButton from '../components/SecondaryButton';
import { useMatchmaking } from '../contexts/MatchmakingContext';
import { useAuth } from '../contexts/useAuth';
import { apiGet, apiPatch, apiPost } from '../services/api';
import type { NormalizedGame, UserLibraryData } from '../types/game';

import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BoltIcon from '@mui/icons-material/Bolt';
import CasinoIcon from '@mui/icons-material/Casino';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ExploreIcon from '@mui/icons-material/Explore';
import ExtensionIcon from '@mui/icons-material/Extension';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import GroupsIcon from '@mui/icons-material/Groups';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PaletteIcon from '@mui/icons-material/Palette';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';
import StairsIcon from '@mui/icons-material/Stairs';

/* ── Fonts ── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

/* ── Keyframes ── */
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes floatIn {
    from { opacity: 0; transform: scale(0.96) translateY(12px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.75; }
  }
  .gp-hero   { animation: floatIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
  .gp-card-0 { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.10s both; }
  .gp-card-1 { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.20s both; }
  .gp-card-2 { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.30s both; }
  .gp-card-3 { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
  .gp-card-4 { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.50s both; }
  .gp-card-5 { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) 0.60s both; }
`;
document.head.appendChild(styleEl);

/* ── Tokens ── */
const C = {
  pageBg: '#ffd3d3',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentSoft: 'rgba(211,47,47,0.10)',
  accentGlow: 'rgba(211,47,47,0.22)',
  title: '#0f0f0f',
  text: '#2b2b2b',
  muted: '#6e6e73',
  light: '#b0b0b8',
  glass: 'rgba(255,255,255,0.52)',
  glassBorder: 'rgba(255,255,255,0.72)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

const blob = (override: Record<string, unknown> = {}) => ({
  background: C.glass,
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  border: `1.5px solid ${C.glassBorder}`,
  borderRadius: '32px',
  boxShadow:
    '0 4px 32px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.85)',
  transition:
    'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow:
      '0 12px 40px rgba(0,0,0,0.11), inset 0 1.5px 0 rgba(255,255,255,0.9)',
  },
  ...override,
});

const GENRE_ICON_MAP: Record<string, React.ReactElement> = {
  Action: <LocalFireDepartmentIcon fontSize="small" />,
  Adventure: <ExploreIcon fontSize="small" />,
  'Role-playing (RPG)': <AutoFixHighIcon fontSize="small" />,
  Shooter: <GpsFixedIcon fontSize="small" />,
  Strategy: <PsychologyIcon fontSize="small" />,
  'Real Time Strategy (RTS)': <PsychologyIcon fontSize="small" />,
  'Turn-based strategy (TBS)': <PsychologyIcon fontSize="small" />,
  Tactical: <PsychologyIcon fontSize="small" />,
  Simulation: <EngineeringIcon fontSize="small" />,
  Simulator: <EngineeringIcon fontSize="small" />,
  Indie: <PaletteIcon fontSize="small" />,
  Puzzle: <ExtensionIcon fontSize="small" />,
  Racing: <DirectionsCarIcon fontSize="small" />,
  Sport: <SportsSoccerIcon fontSize="small" />,
  "Hack and slash/Beat 'em up": <BoltIcon fontSize="small" />,
  Platform: <StairsIcon fontSize="small" />,
  Music: <MusicNoteIcon fontSize="small" />,
  'Card & Board Game': <CasinoIcon fontSize="small" />,
  'Point-and-click': <MenuBookIcon fontSize="small" />,
  'Visual Novel': <MenuBookIcon fontSize="small" />,
  'Massively Multiplayer Online (MMO)': <GroupsIcon fontSize="small" />,
  MOBA: <GroupsIcon fontSize="small" />,
  Fighting: <SportsMartialArtsIcon fontSize="small" />,
  Arcade: <SportsEsportsIcon fontSize="small" />,
  Aventure: <ExploreIcon fontSize="small" />,
  RPG: <AutoFixHighIcon fontSize="small" />,
  FPS: <GpsFixedIcon fontSize="small" />,
  TPS: <GpsFixedIcon fontSize="small" />,
  Stratégie: <PsychologyIcon fontSize="small" />,
  Course: <DirectionsCarIcon fontSize="small" />,
  "Hack'n Slash": <BoltIcon fontSize="small" />,
  Plateforme: <StairsIcon fontSize="small" />,
  'Jeu de cartes': <CasinoIcon fontSize="small" />,
};

function getHighResImage(url: string | null) {
  if (!url) return '';
  return url.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p');
}

function formatDate(isoDate: string | null) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('fr-FR');
}

function PillLabel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.5,
        py: 0.4,
        borderRadius: 999,
        background: C.accentSoft,
        border: `1px solid ${C.accentGlow}`,
        mb: 1,
      }}
    >
      <Typography
        sx={{
          fontFamily: FONT_BODY,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: C.accent,
          lineHeight: 1,
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function FluidDivider() {
  return (
    <Box
      sx={{
        height: '1.5px',
        mb: 3,
        background: `linear-gradient(to right, ${C.accentGlow}, rgba(241,199,199,0.3), transparent)`,
        borderRadius: 99,
      }}
    />
  );
}

export default function GamePage() {
  const { id, igdbId } = useParams();
  const { isAuthenticated, setAuthModalOpen, setPendingAction } = useAuth();
  const { startMatchmaking, isMatching } = useMatchmaking();

  const [game, setGame] = useState<NormalizedGame | null>(null);
  const [gameNotFound, setGameNotFound] = useState(false);
  const [djangoId, setDjangoId] = useState<number | null>(null);
  const [userGame, setUserGame] = useState<UserLibraryData | null>(null);
  const [userReview, setUserReview] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<
    string | null
  >(null);
  const [translating, setTranslating] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null
  );
  const DESCRIPTION_LIMIT = 200;

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        if (igdbId) {
          const data = await fetchIgdbGameById(Number(igdbId));
          setGame(data);
        } else {
          const data = await apiGet(`/api/games/${id}/`);
          setGame({ ...data, name: data.name_fr || data.name });
          setDjangoId(data.id);
          setUserGame(data.user_library);
        }
      } catch {
        setGameNotFound(true);
      }
    };
    fetchGameData();
  }, [id, igdbId]);

  useEffect(() => {
    if (!isAuthenticated || !djangoId) return;
    apiGet(`/api/games/${djangoId}/`)
      .then((data: NormalizedGame) => {
        if (data.user_library) setUserGame(data.user_library);
      })
      .catch(() => {});
  }, [isAuthenticated, djangoId]);

  useEffect(() => {
    if (!game?.summary) return;
    setTranslating(true);
    setTranslatedDescription(null);
    translateDescription(game.summary)
      .then(setTranslatedDescription)
      .catch(() => {})
      .finally(() => setTranslating(false));
  }, [game?.summary]);

  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentUserId(null);
      return;
    }
    apiGet('/api/me')
      .then((me: { id: number }) => setCurrentUserId(me.id))
      .catch(() => setCurrentUserId(null));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!djangoId || !isAuthenticated) {
      setUserReview(null);
      return;
    }
    apiGet(`/api/reviews/?game=${djangoId}`)
      .then((data: any) => {
        const reviews = Array.isArray(data) ? data : (data.results ?? []);
        setUserReview(
          reviews.find((r: any) => r.user?.id === currentUserId) || null
        );
      })
      .catch(() => setUserReview(null));
  }, [djangoId, isAuthenticated, currentUserId]);

  async function ensureDjangoId(): Promise<number | null> {
    if (djangoId) return djangoId;
    if (!game) return null;
    try {
      const { game_id, normalized_game } = await resolveGameIdIfNeeded(game);
      setDjangoId(game_id);
      setGame(normalized_game);
      if (normalized_game.user_library)
        setUserGame(normalized_game.user_library);
      return game_id;
    } catch {
      return null;
    }
  }

  async function handleSetStatus(
    status: 'EN_COURS' | 'TERMINE' | 'ENVIE_DE_JOUER',
    isPending = false
  ) {
    if (!isAuthenticated && !isPending) {
      setPendingAction(() => () => handleSetStatus(status, true));
      setAuthModalOpen(true);
      return;
    }
    const did = await ensureDjangoId();
    if (!did) return;
    try {
      if (userGame) {
        const u = await apiPatch(`/api/me/games/${did}/`, { status });
        setUserGame({ ...userGame, status: u.status });
      } else {
        const c = await apiPost('/api/me/games/', { game_id: did, status });
        setUserGame(c);
      }
    } catch {
      alert('Erreur lors de la mise à jour du statut');
    }
  }

  async function handleToggleFavorite(isPending = false) {
    if (!isAuthenticated && !isPending) {
      setPendingAction(() => () => handleToggleFavorite(true));
      setAuthModalOpen(true);
      return;
    }
    const did = await ensureDjangoId();
    if (!did) return;
    try {
      const u = await apiPatch(`/api/me/games/${did}/`, {
        is_favorite: !userGame?.is_favorite,
      });
      setUserGame(u);
    } catch {
      alert('Erreur lors de la mise à jour du coup de cœur');
    }
  }

  async function handleSetMatchmaking(isPending = false) {
    if (!isAuthenticated && !isPending) {
      setPendingAction(() => () => handleSetMatchmaking(true));
      setAuthModalOpen(true);
      return;
    }
    const did = await ensureDjangoId();
    if (!did || !game) return;
    await startMatchmaking(
      String(did),
      game.name,
      getHighResImage(game.cover_url)
    );
  }

  if (gameNotFound || !game) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.pageBg,
        }}
      >
        <Typography
          sx={{
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 22,
            color: C.title,
          }}
        >
          {gameNotFound ? 'Jeu introuvable.' : 'Chargement…'}
        </Typography>
      </Box>
    );
  }

  const fullText = translating
    ? 'Traduction en cours…'
    : (translatedDescription ??
      game.summary ??
      'Aucune description disponible.');
  const isTruncatable = !translating && fullText.length > DESCRIPTION_LIMIT;
  const displayText =
    isTruncatable && !descriptionExpanded
      ? fullText.slice(0, DESCRIPTION_LIMIT) + '…'
      : fullText;

  const noHover = {
    '&:hover': {
      transform: 'none',
      boxShadow:
        '0 4px 32px rgba(0,0,0,0.07), inset 0 1.5px 0 rgba(255,255,255,0.85)',
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FONT_BODY,
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 140% 90% at 10% -15%, rgba(255,190,190,0.7) 0%, transparent 50%),
          radial-gradient(ellipse 90% 70% at 95% 105%, rgba(211,47,47,0.09) 0%, transparent 45%),
          radial-gradient(ellipse 60% 50% at 50% 60%, rgba(255,220,220,0.4) 0%, transparent 60%),
          ${C.pageBg}
        `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        {/* ── Top bar ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 5,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: { xs: 22, md: 26 },
              background: `linear-gradient(135deg, ${C.title} 40%, ${C.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: -0.8,
            }}
          >
            Ludokan
          </Typography>
        </Box>

        {/* ── HERO ── */}
        <Box
          className="gp-hero"
          sx={{ position: 'relative', mb: { xs: 3, md: 5 } }}
        >
          <Box
            sx={{
              width: '100%',
              height: { xs: 260, sm: 340, md: 460 },
              borderRadius: '40px',
              overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${getHighResImage(game.cover_url)})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.62) blur(3px)',
                transform: 'scale(1.06)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 25%, rgba(0,0,0,0.72) 100%)',
              }}
            />

            {/* Contenu hero */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                px: { xs: 3, md: 5 },
                pb: { xs: 3, md: 4 },
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: { xs: 2, md: 3 },
                }}
              >
                {/* Cover miniature */}
                <Box
                  sx={{
                    position: 'relative',
                    flexShrink: 0,
                    mb: { xs: 0, md: '-28px' },
                  }}
                >
                  <Box
                    component="img"
                    src={getHighResImage(game.cover_url)}
                    alt={game.name}
                    sx={{
                      width: { xs: 72, md: 110 },
                      height: { xs: 92, md: 142 },
                      objectFit: 'cover',
                      borderRadius: '20px',
                      border: '3px solid rgba(255,255,255,0.55)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                      display: 'block',
                    }}
                  />
                  <Tooltip title="Coup de cœur" arrow>
                    <Box
                      onClick={() => handleToggleFavorite()}
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        zIndex: 2,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(8px)',
                        border: '1.5px solid rgba(255,255,255,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.18s ease',
                        '&:hover': { transform: 'scale(1.15)' },
                      }}
                    >
                      {userGame?.is_favorite ? (
                        <FavoriteIcon sx={{ color: '#ff4444', fontSize: 16 }} />
                      ) : (
                        <FavoriteBorderIcon
                          sx={{ color: '#fff', fontSize: 16 }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                </Box>

                {/* Titre */}
                <Box sx={{ pb: 0.5 }}>
                  <Typography
                    sx={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 900,
                      fontSize: { xs: 26, md: 40 },
                      color: '#fff',
                      lineHeight: 1.05,
                      letterSpacing: -0.8,
                      textShadow: '0 2px 20px rgba(0,0,0,0.4)',
                    }}
                  >
                    {game.name}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      mt: 0.75,
                      flexWrap: 'wrap',
                    }}
                  >
                    {game.publisher?.name && (
                      <Typography
                        sx={{
                          fontFamily: FONT_BODY,
                          fontSize: 13,
                          color: 'rgba(255,255,255,0.75)',
                          fontWeight: 500,
                        }}
                      >
                        {game.publisher.name}
                      </Typography>
                    )}
                    {game.release_date && (
                      <>
                        <Box
                          sx={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            bgcolor: 'rgba(255,255,255,0.4)',
                          }}
                        />
                        <Typography
                          sx={{
                            fontFamily: FONT_BODY,
                            fontSize: 13,
                            color: 'rgba(255,255,255,0.6)',
                          }}
                        >
                          {formatDate(game.release_date)}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Actions */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'center',
                  pb: 0.5,
                  flexWrap: 'wrap',
                }}
              >
                <SecondaryButton
                  onClick={() => handleSetMatchmaking()}
                  disabled={isMatching}
                >
                  {isMatching ? 'Recherche…' : 'Matchmaking'}
                </SecondaryButton>
                <Button
                  variant="contained"
                  onClick={() => handleSetStatus('ENVIE_DE_JOUER')}
                  sx={{
                    borderRadius: 999,
                    px: 3,
                    py: 1.1,
                    fontWeight: 700,
                    fontSize: 14,
                    textTransform: 'none',
                    fontFamily: FONT_BODY,
                    background: `linear-gradient(135deg, ${C.accent} 0%, #ef5350 100%)`,
                    boxShadow: `0 4px 20px ${C.accentGlow}`,
                    backdropFilter: 'blur(8px)',
                    '&:hover': {
                      background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
                      transform: 'translateY(-2px)',
                      boxShadow: `0 8px 28px rgba(211,47,47,0.35)`,
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  + Collection
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ height: { xs: 8, md: 32 } }} />

        {/* ── 3 CARDS ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 2.5,
            mb: 2.5,
          }}
        >
          {/* Note */}
          <Box
            className="gp-card-0"
            sx={{
              ...blob(),
              p: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: -50,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 140,
                height: 140,
                borderRadius: '50%',
                background: C.accentSoft,
                filter: 'blur(35px)',
                animation: 'pulseGlow 3s ease-in-out infinite',
              },
            }}
          >
            <PillLabel>Communauté</PillLabel>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                color: C.title,
                letterSpacing: -0.3,
              }}
            >
              Note globale
            </Typography>
            <Rating
              value={(game.average_rating || game.rating_avg || 0) / 2}
              readOnly
              precision={0.5}
              sx={{
                fontSize: 30,
                '& .MuiRating-iconFilled': { color: C.accent },
              }}
            />
          </Box>

          {/* Statut */}
          <Box className="gp-card-1" sx={{ ...blob(), p: '28px 32px' }}>
            <PillLabel>Ma bibliothèque</PillLabel>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                color: C.title,
                letterSpacing: -0.3,
                mb: 2,
              }}
            >
              Statut
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {[
                {
                  icon: <CheckCircleIcon />,
                  label: 'Terminé',
                  status: 'TERMINE' as const,
                  color: '#4caf50',
                },
                {
                  icon: <PlayCircleIcon />,
                  label: 'En cours',
                  status: 'EN_COURS' as const,
                  color: C.accent,
                },
                {
                  icon: <BookmarkIcon />,
                  label: "Envie d'y jouer",
                  status: 'ENVIE_DE_JOUER' as const,
                  color: '#ff9800',
                },
              ].map(({ icon, label, status, color }) => {
                const active = userGame?.status === status;
                return (
                  <Box
                    key={status}
                    onClick={() => handleSetStatus(status)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      cursor: 'pointer',
                      px: 1.5,
                      py: 1,
                      borderRadius: '16px',
                      background: active ? `${color}18` : 'transparent',
                      border: active
                        ? `1px solid ${color}33`
                        : '1px solid transparent',
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        background: 'rgba(0,0,0,0.04)',
                        borderColor: 'rgba(0,0,0,0.06)',
                      },
                    }}
                  >
                    {React.cloneElement(icon, {
                      sx: { fontSize: 20, color: active ? color : C.muted },
                    } as any)}
                    <Typography
                      sx={{
                        fontFamily: FONT_BODY,
                        fontSize: 13.5,
                        fontWeight: active ? 700 : 400,
                        color: active ? color : C.text,
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                );
              })}
              <Tooltip title="Coup de cœur" arrow>
                <Box
                  onClick={() => handleToggleFavorite()}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    px: 1.5,
                    py: 1,
                    borderRadius: '16px',
                    background: userGame?.is_favorite
                      ? 'rgba(255,68,68,0.10)'
                      : 'transparent',
                    border: userGame?.is_favorite
                      ? '1px solid rgba(255,68,68,0.25)'
                      : '1px solid transparent',
                    transition: 'all 0.18s ease',
                    '&:hover': { background: 'rgba(0,0,0,0.04)' },
                  }}
                >
                  {userGame?.is_favorite ? (
                    <FavoriteIcon sx={{ color: '#ff4444', fontSize: 20 }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ color: C.muted, fontSize: 20 }} />
                  )}
                  <Typography
                    sx={{
                      fontFamily: FONT_BODY,
                      fontSize: 13.5,
                      fontWeight: userGame?.is_favorite ? 700 : 400,
                      color: userGame?.is_favorite ? '#ff4444' : C.text,
                    }}
                  >
                    Coup de cœur
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Box>

          {/* Plateformes */}
          <Box className="gp-card-2" sx={{ ...blob(), p: '28px 32px' }}>
            <PillLabel>Disponible sur</PillLabel>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                color: C.title,
                letterSpacing: -0.3,
                mb: 2,
              }}
            >
              Plateformes
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              <DevicesIcon sx={{ color: C.muted, fontSize: 18 }} />
              <PlatformLogos platforms={game.platforms ?? []} />
            </Box>
          </Box>
        </Box>

        {/* ── DESCRIPTION + DETAILS ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 2.5,
            mb: 2.5,
          }}
        >
          <Box className="gp-card-3" sx={{ ...blob(), p: '32px 36px' }}>
            <PillLabel>Synopsis</PillLabel>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
            >
              <DescriptionIcon sx={{ color: C.accent, fontSize: 20 }} />
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 20,
                  color: C.title,
                  letterSpacing: -0.3,
                }}
              >
                Description
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                fontSize: 14.5,
                lineHeight: 1.8,
                color: translating ? C.muted : C.text,
                textAlign: 'justify',
              }}
            >
              {displayText}
            </Typography>
            {isTruncatable && (
              <Button
                size="small"
                onClick={() => setDescriptionExpanded(p => !p)}
                sx={{
                  mt: 1.5,
                  p: 0,
                  textTransform: 'none',
                  fontFamily: FONT_BODY,
                  fontWeight: 600,
                  color: C.accent,
                  fontSize: 13,
                }}
              >
                {descriptionExpanded ? 'Voir moins ↑' : 'Voir plus ↓'}
              </Button>
            )}
          </Box>

          <Box
            className="gp-card-4"
            sx={{
              ...blob(),
              p: '32px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
              >
                <CategoryIcon sx={{ color: C.accent, fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    color: C.light,
                  }}
                >
                  Genres
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                {game.genres && game.genres.length > 0 ? (
                  game.genres.map((g: any) => (
                    <Chip
                      key={g.name}
                      label={g.name}
                      size="small"
                      icon={GENRE_ICON_MAP[g.name]}
                      sx={{
                        fontFamily: FONT_BODY,
                        fontWeight: 600,
                        fontSize: 12,
                        backgroundColor: C.accentSoft,
                        border: `1px solid ${C.accentGlow}`,
                        color: C.accent,
                        borderRadius: '12px',
                        '& .MuiChip-icon': { color: C.accent },
                      }}
                    />
                  ))
                ) : (
                  <Typography
                    sx={{ fontFamily: FONT_BODY, fontSize: 14, color: C.muted }}
                  >
                    Non renseigné
                  </Typography>
                )}
              </Box>
            </Box>

            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}
              >
                <CalendarTodayIcon sx={{ color: C.accent, fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    color: C.light,
                  }}
                >
                  Sortie
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 17,
                  color: C.title,
                  letterSpacing: -0.3,
                }}
              >
                {formatDate(game.release_date) || 'Non renseignée'}
              </Typography>
            </Box>

            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}
              >
                <BusinessIcon sx={{ color: C.accent, fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: FONT_BODY,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.8,
                    textTransform: 'uppercase',
                    color: C.light,
                  }}
                >
                  Éditeur
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 17,
                  color: C.title,
                  letterSpacing: -0.3,
                }}
              >
                {game.publisher?.name || 'Non renseigné'}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── MÉDIAS ── */}
        {((game.screenshots && game.screenshots.length > 0) ||
          (game.videos && game.videos.length > 0)) && (
          <Box
            className="gp-card-5"
            sx={{ ...blob(noHover), p: { xs: 2.5, md: 4 }, mb: 2.5 }}
          >
            <Box sx={{ mb: 3 }}>
              <PillLabel>Galerie</PillLabel>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 20,
                  color: C.title,
                  letterSpacing: -0.3,
                }}
              >
                Médias
              </Typography>
            </Box>
            <FluidDivider />

            {game.videos && game.videos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 760,
                    mx: 'auto',
                    aspectRatio: '16/9',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
                  }}
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${game.videos[0].video_id}`}
                    title={game.videos[0].name || 'Trailer'}
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

            {game.screenshots && game.screenshots.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 5 },
                  '&::-webkit-scrollbar-thumb': {
                    borderRadius: 99,
                    bgcolor: 'rgba(211,47,47,0.2)',
                  },
                  '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                }}
              >
                {game.screenshots.map(s => (
                  <Box
                    key={s.url}
                    component="img"
                    src={s.url}
                    alt={game.name ? `Capture — ${game.name}` : 'Capture'}
                    onClick={() => setSelectedScreenshot(s.url)}
                    sx={{
                      height: { xs: 140, sm: 200 },
                      minWidth: { xs: 220, sm: 320 },
                      objectFit: 'cover',
                      borderRadius: '20px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: '0 8px 28px rgba(0,0,0,0.16)',
                      },
                    }}
                  />
                ))}
              </Box>
            )}

            {selectedScreenshot && (
              <Modal open onClose={() => setSelectedScreenshot(null)}>
                <Box
                  onClick={() => setSelectedScreenshot(null)}
                  sx={{
                    position: 'fixed',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.88)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'zoom-out',
                  }}
                >
                  <Box
                    component="img"
                    src={selectedScreenshot}
                    alt="Screenshot agrandi"
                    sx={{
                      maxWidth: '90vw',
                      maxHeight: '90vh',
                      borderRadius: '24px',
                      boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    }}
                  />
                </Box>
              </Modal>
            )}
          </Box>
        )}

        {/* ── AVIS ── */}
        <Box sx={{ ...blob(noHover), p: { xs: 2.5, md: 4 } }}>
          <Box sx={{ mb: 3 }}>
            <PillLabel>Opinions</PillLabel>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
                color: C.title,
                letterSpacing: -0.3,
              }}
            >
              Avis de la communauté
            </Typography>
          </Box>
          <FluidDivider />
          <ReviewSection
            gameId={djangoId ? String(djangoId) : ''}
            resolveGameId={ensureDjangoId}
            userReview={userReview}
            currentUserId={currentUserId}
            onReviewChange={review => setUserReview(review)}
          />
        </Box>
      </Box>
    </Box>
  );
}
