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
  Paper,
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

/* ─── Google Fonts injection ─── */
const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLink);

/* ── Keyframes injected once ── */
const styleEl = document.createElement('style');
styleEl.textContent = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.94); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  .game-hero-card  { animation: fadeUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }
  .game-info-0     { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both; }
  .game-info-1     { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.16s both; }
  .game-stat-0     { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.24s both; }
  .game-stat-1     { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.32s both; }
  .game-stat-2     { animation: scaleIn 0.45s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
  .game-media      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.48s both; }
  .game-reviews    { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.56s both; }
`;
document.head.appendChild(styleEl);

/* ─── Design tokens (identiques à ProfilePage) ─── */
const C = {
  pageBg: '#ffd3d3',
  cardBg: 'rgba(255,255,255,0.72)',
  border: '#f1c7c7',
  softBorder: 'rgba(241,199,199,0.5)',
  title: '#0f0f0f',
  text: '#2b2b2b',
  muted: '#6e6e73',
  light: '#a0a0a8',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentGlow: 'rgba(211,47,47,0.15)',
  glass: 'rgba(255,250,250,0.78)',
  glassBorder: 'rgba(255,255,255,0.9)',
};

const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'DM Sans', system-ui, sans-serif";

const glassCard = {
  background: C.cardBg,
  backdropFilter: 'blur(20px) saturate(160%)',
  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: `1px solid ${C.glassBorder}`,
  borderRadius: '20px',
  boxShadow: '0 2px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
  transition: 'transform 0.22s ease, box-shadow 0.22s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow:
      '0 8px 32px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
};

const sectionLabel = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: 'uppercase' as const,
  color: C.accent,
  mb: 0.5,
  fontFamily: FONT_BODY,
};

const sectionTitle = {
  fontFamily: FONT_DISPLAY,
  fontWeight: 700,
  fontSize: 20,
  color: C.title,
  letterSpacing: -0.3,
};

/* ─── Genre icons ─── */
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
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR');
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
  const DESCRIPTION_LIMIT = 150;

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
        const myReview = reviews.find((r: any) => r.user?.id === currentUserId);
        setUserReview(myReview || null);
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
    } catch (err) {
      console.error('[ensureDjangoId]', err);
      return null;
    }
  }

  async function handleSetStatus(
    status: 'EN_COURS' | 'TERMINE' | 'ENVIE_DE_JOUER',
    isPendingAction = false
  ) {
    if (!isAuthenticated && !isPendingAction) {
      setPendingAction(() => () => handleSetStatus(status, true));
      setAuthModalOpen(true);
      return;
    }
    const currentDjangoId = await ensureDjangoId();
    if (currentDjangoId === null) return;
    try {
      if (userGame) {
        const updated = await apiPatch(`/api/me/games/${currentDjangoId}/`, {
          status,
        });
        setUserGame({ ...userGame, status: updated.status });
      } else {
        const created = await apiPost('/api/me/games/', {
          game_id: currentDjangoId,
          status,
        });
        setUserGame(created);
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour du statut');
    }
  }

  async function handleToggleFavorite(isPendingAction = false) {
    if (!isAuthenticated && !isPendingAction) {
      setPendingAction(() => () => handleToggleFavorite(true));
      setAuthModalOpen(true);
      return;
    }
    const currentDjangoId = await ensureDjangoId();
    if (currentDjangoId === null) return;
    try {
      const updated = await apiPatch(`/api/me/games/${currentDjangoId}/`, {
        is_favorite: !userGame?.is_favorite,
      });
      setUserGame(updated);
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour du coup de cœur');
    }
  }

  async function handleSetMatchmaking(isPendingAction = false) {
    if (!isAuthenticated && !isPendingAction) {
      setPendingAction(() => () => handleSetMatchmaking(true));
      setAuthModalOpen(true);
      return;
    }
    const currentDjangoId = await ensureDjangoId();
    if (currentDjangoId === null || !game) return;
    const gameImage = getHighResImage(game.cover_url);
    await startMatchmaking(String(currentDjangoId), game.name, gameImage);
  }

  /* ─── États de chargement ─── */
  const loadingOrNotFound = (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_BODY,
        background: `
          radial-gradient(ellipse 120% 80% at 15% -10%, rgba(255,200,200,0.6) 0%, transparent 55%),
          ${C.pageBg}
        `,
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
        {gameNotFound
          ? 'Jeu introuvable dans notre base de données.'
          : 'Chargement du jeu…'}
      </Typography>
    </Box>
  );

  if (gameNotFound || !game) return loadingOrNotFound;

  /* ─── Données description ─── */
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FONT_BODY,
        background: `
          url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E"),
          radial-gradient(ellipse 120% 80% at 15% -10%, rgba(255,200,200,0.6) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 90% 110%, rgba(211,47,47,0.07) 0%, transparent 50%),
          ${C.pageBg}
        `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1160, mx: 'auto' }}>
        {/* ── Top bar ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 4,
          }}
        >
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 900,
              fontSize: { xs: 22, md: 26 },
              color: C.title,
              letterSpacing: -0.8,
              background: `linear-gradient(135deg, ${C.title} 40%, ${C.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Ludokan
          </Typography>
        </Box>

        {/* ── HERO BANNER ── */}
        <Box sx={{ position: 'relative', mb: { xs: 8, md: 7 } }}>
          {/* Image de couverture en bannière */}
          <Box
            sx={{
              width: '100%',
              height: { xs: 220, sm: 280, md: 380 },
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
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
                filter: 'brightness(0.75) blur(2px)',
                transform: 'scale(1.05)',
              }}
            />
            {/* Gradient scrim */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(160deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.55) 100%)',
              }}
            />
          </Box>

          {/* Floating identity card (même pattern que ProfilePage) */}
          <Box
            className="game-hero-card"
            sx={{
              position: 'absolute',
              left: { xs: 16, md: 28 },
              right: { xs: 16, md: 28 },
              bottom: { xs: -100, md: -88 },
              ...glassCard,
              '&:hover': { transform: 'none', boxShadow: glassCard.boxShadow },
              px: { xs: 2.5, md: 4 },
              py: { xs: 2.5, md: 3 },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                justifyContent: 'space-between',
                gap: { xs: 2, md: 3 },
              }}
            >
              {/* Cover + titre */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: { xs: 2, md: 3 },
                }}
              >
                <Box sx={{ position: 'relative', flexShrink: 0 }}>
                  {/* Anneau accent (même shimmer que l'avatar ProfilePage) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '16px',
                      background: `conic-gradient(from 180deg, ${C.accent}, #ff8a80, ${C.accent})`,
                      opacity: 0.35,
                      animation: 'shimmer 2s linear infinite',
                      backgroundSize: '200% auto',
                      pointerEvents: 'none',
                    }}
                  />
                  <Box
                    component="img"
                    src={getHighResImage(game.cover_url)}
                    alt={game.name}
                    sx={{
                      width: { xs: 70, md: 88 },
                      height: { xs: 88, md: 112 },
                      objectFit: 'cover',
                      borderRadius: '14px',
                      border: '3px solid white',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
                      position: 'relative',
                      zIndex: 1,
                      display: 'block',
                    }}
                  />
                  {/* Bouton favori sur la cover */}
                  <Box
                    onClick={() => handleToggleFavorite()}
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      zIndex: 10,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Tooltip title="Coup de cœur" arrow>
                      {userGame?.is_favorite ? (
                        <FavoriteIcon sx={{ color: '#ff1744', fontSize: 16 }} />
                      ) : (
                        <FavoriteBorderIcon
                          sx={{ color: '#ffffff', fontSize: 16 }}
                        />
                      )}
                    </Tooltip>
                  </Box>
                </Box>

                {/* Titre + meta */}
                <Box>
                  <Typography
                    sx={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 900,
                      fontSize: { xs: 24, md: 32 },
                      color: C.title,
                      lineHeight: 1.05,
                      letterSpacing: -0.6,
                    }}
                  >
                    {game.name}
                  </Typography>
                  {game.publisher?.name && (
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: C.muted,
                        fontSize: 13.5,
                        fontFamily: FONT_BODY,
                        fontWeight: 400,
                      }}
                    >
                      {game.publisher.name}
                    </Typography>
                  )}
                  {game.release_date && (
                    <Typography
                      sx={{
                        mt: 0.5,
                        color: C.light,
                        fontSize: 12.5,
                        fontFamily: FONT_BODY,
                      }}
                    >
                      {formatDate(game.release_date)}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Actions */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'row', md: 'column' },
                  gap: 1.5,
                  flexShrink: 0,
                  alignSelf: { xs: 'flex-start', md: 'center' },
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
                    py: 1,
                    fontWeight: 700,
                    fontSize: 14,
                    textTransform: 'none',
                    fontFamily: FONT_BODY,
                    background: `linear-gradient(135deg, ${C.accent} 0%, #e53935 100%)`,
                    boxShadow: `0 4px 18px ${C.accentGlow}`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${C.accentDark} 0%, ${C.accent} 100%)`,
                      boxShadow: `0 6px 24px rgba(211,47,47,0.28)`,
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.18s ease',
                  }}
                >
                  Ajouter à la collection
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Spacer pour la floating card */}
        <Box sx={{ height: { xs: 56, md: 44 } }} />

        {/* ── STATUTS + NOTE ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
            gap: 2,
            mb: 2.5,
          }}
        >
          {/* Note communauté */}
          <Paper
            elevation={0}
            className="game-stat-0"
            sx={{
              ...glassCard,
              p: '26px 28px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '2px',
                background: `linear-gradient(to right, transparent, ${C.accent}55, transparent)`,
              },
            }}
          >
            <Typography sx={{ ...sectionLabel }}>Communauté</Typography>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
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
              sx={{ mt: 1, fontSize: 32 }}
            />
          </Paper>

          {/* Statut personnel */}
          <Paper
            elevation={0}
            className="game-stat-1"
            sx={{
              ...glassCard,
              p: '26px 28px',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '2px',
                background: `linear-gradient(to right, transparent, ${C.accent}55, transparent)`,
              },
            }}
          >
            <Typography sx={{ ...sectionLabel }}>Ma bibliothèque</Typography>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
                color: C.title,
                letterSpacing: -0.3,
                mb: 2,
              }}
            >
              Statut
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                {
                  icon: (
                    <CheckCircleIcon
                      sx={{
                        color:
                          userGame?.status === 'TERMINE' ? '#4caf50' : C.light,
                        fontSize: 22,
                        cursor: 'pointer',
                      }}
                    />
                  ),
                  label: 'Terminé',
                  active: userGame?.status === 'TERMINE',
                  onClick: () => handleSetStatus('TERMINE'),
                },
                {
                  icon: (
                    <PlayCircleIcon
                      sx={{
                        color:
                          userGame?.status === 'EN_COURS' ? C.accent : C.light,
                        fontSize: 22,
                        cursor: 'pointer',
                      }}
                    />
                  ),
                  label: 'En cours',
                  active: userGame?.status === 'EN_COURS',
                  onClick: () => handleSetStatus('EN_COURS'),
                },
                {
                  icon: (
                    <BookmarkIcon
                      sx={{
                        color:
                          userGame?.status === 'ENVIE_DE_JOUER'
                            ? '#ff9800'
                            : C.light,
                        fontSize: 22,
                        cursor: 'pointer',
                      }}
                    />
                  ),
                  label: "Envie d'y jouer",
                  active: userGame?.status === 'ENVIE_DE_JOUER',
                  onClick: () => handleSetStatus('ENVIE_DE_JOUER'),
                },
              ].map(({ icon, label, active, onClick }) => (
                <Box
                  key={label}
                  onClick={onClick}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    cursor: 'pointer',
                    px: 1.5,
                    py: 1,
                    borderRadius: '12px',
                    transition: 'background 0.15s ease',
                    background: active ? `${C.accentGlow}` : 'transparent',
                    '&:hover': { background: `rgba(0,0,0,0.04)` },
                  }}
                >
                  {icon}
                  <Typography
                    sx={{
                      fontFamily: FONT_BODY,
                      fontSize: 14,
                      fontWeight: active ? 700 : 400,
                      color: active ? C.accent : C.text,
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
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
                    borderRadius: '12px',
                    transition: 'background 0.15s ease',
                    background: userGame?.is_favorite
                      ? `${C.accentGlow}`
                      : 'transparent',
                    '&:hover': { background: `rgba(0,0,0,0.04)` },
                  }}
                >
                  {userGame?.is_favorite ? (
                    <FavoriteIcon sx={{ color: '#ff1744', fontSize: 22 }} />
                  ) : (
                    <FavoriteBorderIcon sx={{ color: C.light, fontSize: 22 }} />
                  )}
                  <Typography
                    sx={{
                      fontFamily: FONT_BODY,
                      fontSize: 14,
                      fontWeight: userGame?.is_favorite ? 700 : 400,
                      color: userGame?.is_favorite ? C.accent : C.text,
                    }}
                  >
                    Coup de cœur
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Paper>

          {/* Plateformes */}
          <Paper
            elevation={0}
            className="game-stat-2"
            sx={{
              ...glassCard,
              p: '26px 28px',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '40%',
                height: '2px',
                background: `linear-gradient(to right, transparent, ${C.accent}55, transparent)`,
              },
            }}
          >
            <Typography sx={{ ...sectionLabel }}>Disponible sur</Typography>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
                color: C.title,
                letterSpacing: -0.3,
                mb: 2,
              }}
            >
              Plateformes
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <DevicesIcon sx={{ color: C.muted, fontSize: 18, mr: 0.5 }} />
              <PlatformLogos platforms={game.platforms ?? []} />
            </Box>
          </Paper>
        </Box>

        {/* ── INFOS DÉTAILLÉES ── */}
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography
              sx={{
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 18,
                color: C.title,
                letterSpacing: -0.3,
              }}
            >
              Détails
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: '1px',
                background: `linear-gradient(to right, ${C.border}, transparent)`,
              }}
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
              gap: 2,
            }}
          >
            {/* Description */}
            <Paper
              elevation={0}
              className="game-info-0"
              sx={{ ...glassCard, p: '26px 28px' }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
              >
                <DescriptionIcon sx={{ color: C.accent, fontSize: 18 }} />
                <Typography sx={{ ...sectionLabel, mb: 0 }}>
                  Synopsis
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  fontSize: 20,
                  color: C.title,
                  letterSpacing: -0.3,
                  mb: 1.5,
                }}
              >
                Description
              </Typography>
              <Typography
                sx={{
                  color: translating ? C.muted : C.text,
                  lineHeight: 1.75,
                  fontSize: 14,
                  fontFamily: FONT_BODY,
                  textAlign: 'justify',
                }}
              >
                {displayText}
              </Typography>
              {isTruncatable && (
                <Button
                  size="small"
                  onClick={() => setDescriptionExpanded(prev => !prev)}
                  sx={{
                    mt: 1,
                    p: 0,
                    textTransform: 'none',
                    fontFamily: FONT_BODY,
                    fontWeight: 600,
                    color: C.accent,
                    fontSize: 13.5,
                  }}
                >
                  {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
                </Button>
              )}
            </Paper>

            {/* Genres + Éditeur + Date */}
            <Paper
              elevation={0}
              className="game-info-1"
              sx={{
                ...glassCard,
                p: '26px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              {/* Genres */}
              <Box>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <CategoryIcon sx={{ color: C.accent, fontSize: 18 }} />
                  <Typography sx={{ ...sectionLabel, mb: 0 }}>
                    Genres
                  </Typography>
                </Box>
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}
                >
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
                          backgroundColor: 'rgba(211,47,47,0.08)',
                          border: '1px solid rgba(211,47,47,0.2)',
                          color: C.accent,
                          '& .MuiChip-icon': { color: C.accent },
                        }}
                      />
                    ))
                  ) : (
                    <Typography
                      sx={{
                        fontFamily: FONT_BODY,
                        fontSize: 14,
                        color: C.muted,
                      }}
                    >
                      Non renseigné
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Date de sortie */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <CalendarTodayIcon sx={{ color: C.accent, fontSize: 18 }} />
                  <Typography sx={{ ...sectionLabel, mb: 0 }}>
                    Date de sortie
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 18,
                    color: C.title,
                    letterSpacing: -0.3,
                    mt: 0.5,
                  }}
                >
                  {formatDate(game.release_date) || 'Non renseignée'}
                </Typography>
              </Box>

              {/* Éditeur */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <BusinessIcon sx={{ color: C.accent, fontSize: 18 }} />
                  <Typography sx={{ ...sectionLabel, mb: 0 }}>
                    Éditeur
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    fontSize: 18,
                    color: C.title,
                    letterSpacing: -0.3,
                    mt: 0.5,
                  }}
                >
                  {game.publisher?.name || 'Non renseigné'}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* ── MÉDIAS ── */}
        {((game.screenshots && game.screenshots.length > 0) ||
          (game.videos && game.videos.length > 0)) && (
          <Paper
            elevation={0}
            className="game-media"
            sx={{
              ...glassCard,
              '&:hover': { transform: 'none', boxShadow: glassCard.boxShadow },
              p: { xs: 2.5, md: 4 },
              mb: 2.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 3,
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box>
                <Typography sx={{ ...sectionLabel }}>Galerie</Typography>
                <Typography sx={{ ...sectionTitle }}>Médias</Typography>
              </Box>
              {game.screenshots && game.screenshots.length > 0 && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 999,
                    background: 'rgba(211,47,47,0.1)',
                    border: '1px solid rgba(211,47,47,0.25)',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: FONT_BODY,
                      color: C.accent,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {game.screenshots.length} capture
                    {game.screenshots.length > 1 ? 's' : ''}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box
              sx={{
                height: '1px',
                background: `linear-gradient(to right, ${C.accent}33, ${C.border}, transparent)`,
                mb: 3,
              }}
            />

            {/* Vidéo */}
            {game.videos && game.videos.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 800,
                    mx: 'auto',
                    aspectRatio: '16/9',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
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

            {/* Screenshots */}
            {game.screenshots && game.screenshots.length > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 2,
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    borderRadius: 3,
                    bgcolor: 'rgba(0,0,0,0.15)',
                  },
                }}
              >
                {game.screenshots.map(s => (
                  <Box
                    key={s.url}
                    component="img"
                    src={s.url}
                    alt={
                      game.name
                        ? `Capture d'écran — ${game.name}`
                        : "Capture d'écran"
                    }
                    onClick={() => setSelectedScreenshot(s.url)}
                    sx={{
                      height: { xs: 140, sm: 200 },
                      minWidth: { xs: 220, sm: 320 },
                      objectFit: 'cover',
                      borderRadius: '14px',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                      '&:hover': {
                        transform: 'scale(1.02)',
                        boxShadow: '0 6px 24px rgba(0,0,0,0.16)',
                      },
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Modal screenshot */}
            {selectedScreenshot && (
              <Modal open onClose={() => setSelectedScreenshot(null)}>
                <Box
                  onClick={() => setSelectedScreenshot(null)}
                  sx={{
                    position: 'fixed',
                    inset: 0,
                    bgcolor: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'zoom-out',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Box
                    component="img"
                    src={selectedScreenshot}
                    alt="Screenshot agrandi"
                    sx={{
                      maxWidth: '90vw',
                      maxHeight: '90vh',
                      borderRadius: '16px',
                      boxShadow: 8,
                    }}
                  />
                </Box>
              </Modal>
            )}
          </Paper>
        )}

        {/* ── AVIS ── */}
        <Paper
          elevation={0}
          className="game-reviews"
          sx={{
            ...glassCard,
            '&:hover': { transform: 'none', boxShadow: glassCard.boxShadow },
            p: { xs: 2.5, md: 4 },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <Box>
              <Typography sx={{ ...sectionLabel }}>Opinions</Typography>
              <Typography sx={{ ...sectionTitle }}>
                Avis de la communauté
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              height: '1px',
              background: `linear-gradient(to right, ${C.accent}33, ${C.border}, transparent)`,
              mb: 3,
            }}
          />

          <ReviewSection
            gameId={djangoId ? String(djangoId) : ''}
            resolveGameId={ensureDjangoId}
            userReview={userReview}
            currentUserId={currentUserId}
            onReviewChange={review => setUserReview(review)}
          />
        </Paper>
      </Box>
    </Box>
  );
}
