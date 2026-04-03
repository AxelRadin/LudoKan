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
const _fl = document.createElement('link');
_fl.rel = 'stylesheet';
_fl.href =
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
document.head.appendChild(_fl);

/* ── Keyframes ── */
const _se = document.createElement('style');
_se.textContent = `
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
  @keyframes heroIn { from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)} }
  .gp-hero   { animation:heroIn  0.65s cubic-bezier(0.22,1,0.36,1) both }
  .gp-c0     { animation:fadeUp  0.5s  cubic-bezier(0.22,1,0.36,1) 0.12s both }
  .gp-c1     { animation:fadeUp  0.5s  cubic-bezier(0.22,1,0.36,1) 0.22s both }
  .gp-c2     { animation:fadeUp  0.5s  cubic-bezier(0.22,1,0.36,1) 0.32s both }
  .gp-c3     { animation:fadeUp  0.5s  cubic-bezier(0.22,1,0.36,1) 0.42s both }
  .gp-c4     { animation:fadeUp  0.5s  cubic-bezier(0.22,1,0.36,1) 0.52s both }
  .gp-c5     { animation:fadeUp  0.5s  cubic-bezier(0.22,1,0.36,1) 0.62s both }
`;
document.head.appendChild(_se);

/* ── Tokens ── */
const C = {
  pageBg: '#ffd3d3',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentSoft: 'rgba(211,47,47,0.09)',
  accentGlow: 'rgba(211,47,47,0.2)',
  title: '#0f0f0f',
  text: '#2b2b2b',
  muted: '#6e6e73',
  light: '#b0b0b8',
  cardBg: 'rgba(255,255,255,0.88)',
  cardBorder: 'rgba(255,255,255,0.95)',
};
const FD = "'Playfair Display', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

/* ── Shared card style ── */
const card = (ov: Record<string, unknown> = {}) => ({
  background: C.cardBg,
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: `1px solid ${C.cardBorder}`,
  borderRadius: '24px',
  boxShadow: '0 2px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
  transition:
    'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 8px 28px rgba(0,0,0,0.09)',
  },
  ...ov,
});
const noHov = {
  '&:hover': {
    transform: 'none',
    boxShadow:
      '0 2px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
  },
};

/* ── Genre icons ── */
const GMAP: Record<string, React.ReactElement> = {
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

function hi(url: string | null) {
  return url
    ? url.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p')
    : '';
}
function fd(d: string | null) {
  return d ? new Date(d).toLocaleDateString('fr-FR') : '';
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1.25,
        py: 0.35,
        borderRadius: 999,
        background: C.accentSoft,
        border: `1px solid ${C.accentGlow}`,
        mb: 0.75,
      }}
    >
      <Typography
        sx={{
          fontFamily: FB,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 1.8,
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
function Sep() {
  return (
    <Box
      sx={{
        height: '1.5px',
        my: 2.5,
        background: `linear-gradient(to right,${C.accentGlow},rgba(241,199,199,0.25),transparent)`,
        borderRadius: 99,
      }}
    />
  );
}

/* ── Status pill button ── */
function StatusPill({
  icon,
  label,
  active,
  color,
  onClick,
}: {
  icon: React.ReactElement;
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.4,
        py: 0.6,
        borderRadius: '12px',
        cursor: 'pointer',
        background: active ? `${color}18` : 'rgba(0,0,0,0.04)',
        border: `1px solid ${active ? `${color}40` : 'transparent'}`,
        color: active ? color : C.muted,
        transition: 'all 0.15s ease',
        '&:hover': {
          background: `${color}12`,
          borderColor: `${color}30`,
          color,
        },
      }}
    >
      {React.cloneElement(icon, {
        sx: { fontSize: 14, color: 'inherit' },
      } as any)}
      <Typography
        sx={{
          fontFamily: FB,
          fontSize: 12.5,
          fontWeight: active ? 700 : 500,
          color: 'inherit',
        }}
      >
        {label}
      </Typography>
    </Box>
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
  const DLIMIT = 200;

  useEffect(() => {
    (async () => {
      try {
        if (igdbId) {
          setGame(await fetchIgdbGameById(Number(igdbId)));
        } else {
          const d = await apiGet(`/api/games/${id}/`);
          setGame({ ...d, name: d.name_fr || d.name });
          setDjangoId(d.id);
          setUserGame(d.user_library);
        }
      } catch {
        setGameNotFound(true);
      }
    })();
  }, [id, igdbId]);

  useEffect(() => {
    if (!isAuthenticated || !djangoId) return;
    apiGet(`/api/games/${djangoId}/`)
      .then((d: NormalizedGame) => {
        if (d.user_library) setUserGame(d.user_library);
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
      .then((m: { id: number }) => setCurrentUserId(m.id))
      .catch(() => setCurrentUserId(null));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!djangoId || !isAuthenticated) {
      setUserReview(null);
      return;
    }
    apiGet(`/api/reviews/?game=${djangoId}`)
      .then((d: any) => {
        const list = Array.isArray(d) ? d : (d.results ?? []);
        setUserReview(
          list.find((r: any) => r.user?.id === currentUserId) || null
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
    s: 'EN_COURS' | 'TERMINE' | 'ENVIE_DE_JOUER',
    p = false
  ) {
    if (!isAuthenticated && !p) {
      setPendingAction(() => () => handleSetStatus(s, true));
      setAuthModalOpen(true);
      return;
    }
    const did = await ensureDjangoId();
    if (!did) return;
    try {
      if (userGame) {
        const u = await apiPatch(`/api/me/games/${did}/`, { status: s });
        setUserGame({ ...userGame, status: u.status });
      } else {
        const c = await apiPost('/api/me/games/', { game_id: did, status: s });
        setUserGame(c);
      }
    } catch {
      alert('Erreur lors de la mise à jour du statut');
    }
  }

  async function handleToggleFavorite(p = false) {
    if (!isAuthenticated && !p) {
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

  async function handleSetMatchmaking(p = false) {
    if (!isAuthenticated && !p) {
      setPendingAction(() => () => handleSetMatchmaking(true));
      setAuthModalOpen(true);
      return;
    }
    const did = await ensureDjangoId();
    if (!did || !game) return;
    await startMatchmaking(String(did), game.name, hi(game.cover_url));
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
          sx={{ fontFamily: FD, fontWeight: 700, fontSize: 22, color: C.title }}
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
  const isTrunc = !translating && fullText.length > DLIMIT;
  const dispText =
    isTrunc && !descriptionExpanded
      ? fullText.slice(0, DLIMIT) + '…'
      : fullText;

  /* ── Bouton rouge partagé ── */
  const redBtn = {
    borderRadius: 999,
    px: 2.5,
    py: 1,
    fontWeight: 700,
    fontSize: 13,
    textTransform: 'none' as const,
    fontFamily: FB,
    background: `linear-gradient(135deg,${C.accent} 0%,#ef5350 100%)`,
    boxShadow: `0 4px 16px rgba(211,47,47,0.38)`,
    '&:hover': {
      background: `linear-gradient(135deg,${C.accentDark} 0%,${C.accent} 100%)`,
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 22px rgba(211,47,47,0.42)`,
    },
    transition: 'all 0.2s ease',
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FB,
        background: `
        url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
        radial-gradient(ellipse 140% 90% at 10% -15%,rgba(255,190,190,0.7) 0%,transparent 50%),
        radial-gradient(ellipse 90% 70% at 95% 105%,rgba(211,47,47,0.09) 0%,transparent 45%),
        radial-gradient(ellipse 60% 50% at 50% 60%,rgba(255,220,220,0.35) 0%,transparent 60%),
        ${C.pageBg}
      `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        {/* ── Top bar ── */}
        <Box sx={{ mb: 5 }}>
          <Typography
            sx={{
              fontFamily: FD,
              fontWeight: 900,
              fontSize: { xs: 22, md: 26 },
              background: `linear-gradient(135deg,${C.title} 40%,${C.accent})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: -0.8,
            }}
          >
            Ludokan
          </Typography>
        </Box>

        {/* ══════════════════════════════════════════════════════
            HERO : image en portrait à gauche + cards à droite
        ══════════════════════════════════════════════════════ */}
        <Box
          className="gp-hero"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '340px 1fr' },
            gap: 2.5,
            mb: 2.5,
            alignItems: 'stretch',
          }}
        >
          {/* ── IMAGE PORTRAIT ── */}
          <Box
            sx={{
              position: 'relative',
              borderRadius: '28px',
              overflow: 'hidden',
              /* hauteur fixe mobile, s'étire pour matcher les cards sur desktop */
              minHeight: { xs: 260, md: 0 },
              boxShadow: '0 20px 56px rgba(0,0,0,0.22)',
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
            {/* Scrim bas */}
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(175deg,rgba(0,0,0,0) 45%,rgba(0,0,0,0.72) 100%)',
              }}
            />

            {/* Favori */}
            <Tooltip title="Coup de cœur" arrow>
              <Box
                onClick={() => handleToggleFavorite()}
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 3,
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(10px)',
                  border: '1.5px solid rgba(255,255,255,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease,background 0.18s ease',
                  '&:hover': {
                    transform: 'scale(1.12)',
                    background: 'rgba(0,0,0,0.62)',
                  },
                }}
              >
                {userGame?.is_favorite ? (
                  <FavoriteIcon sx={{ color: '#ff4444', fontSize: 18 }} />
                ) : (
                  <FavoriteBorderIcon sx={{ color: '#fff', fontSize: 18 }} />
                )}
              </Box>
            </Tooltip>

            {/* Titre en bas de l'image */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                px: 2.5,
                pb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 900,
                  fontSize: { xs: 26, md: 30 },
                  color: '#fff',
                  lineHeight: 1.05,
                  letterSpacing: -0.8,
                  textShadow: '0 2px 20px rgba(0,0,0,0.55)',
                  mb: 0.5,
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
                {game.publisher?.name && (
                  <Typography
                    sx={{
                      fontFamily: FB,
                      fontSize: 12.5,
                      color: 'rgba(255,255,255,0.78)',
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
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.45)',
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: FB,
                        fontSize: 12.5,
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {fd(game.release_date)}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* ── COLONNE DROITE : 3 cards + boutons ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Card Note */}
            <Box
              className="gp-c0"
              sx={{
                ...card(),
                px: 2.5,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '14px',
                  flexShrink: 0,
                  background: C.accentSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ fontSize: 20 }}>⭐</Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: FB,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: C.light,
                    lineHeight: 1,
                    mb: 0.5,
                  }}
                >
                  Note communauté
                </Typography>
                <Rating
                  value={(game.average_rating || game.rating_avg || 0) / 2}
                  readOnly
                  precision={0.5}
                  sx={{
                    fontSize: 20,
                    '& .MuiRating-iconFilled': { color: C.accent },
                  }}
                />
              </Box>
            </Box>

            {/* Card Plateformes */}
            <Box
              className="gp-c1"
              sx={{
                ...card(),
                px: 2.5,
                py: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '14px',
                  flexShrink: 0,
                  background: C.accentSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DevicesIcon sx={{ color: C.accent, fontSize: 20 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: FB,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: C.light,
                    lineHeight: 1,
                    mb: 0.75,
                  }}
                >
                  Plateformes
                </Typography>
                <PlatformLogos platforms={game.platforms ?? []} />
              </Box>
            </Box>

            {/* Card Statut */}
            <Box
              className="gp-c2"
              sx={{
                ...card(),
                px: 2.5,
                py: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '14px',
                  flexShrink: 0,
                  background: C.accentSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircleIcon sx={{ color: C.accent, fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography
                  sx={{
                    fontFamily: FB,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: C.light,
                    lineHeight: 1,
                    mb: 1,
                  }}
                >
                  Mon statut
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  <StatusPill
                    icon={<CheckCircleIcon />}
                    label="Terminé"
                    active={userGame?.status === 'TERMINE'}
                    color="#4caf50"
                    onClick={() => handleSetStatus('TERMINE')}
                  />
                  <StatusPill
                    icon={<PlayCircleIcon />}
                    label="En cours"
                    active={userGame?.status === 'EN_COURS'}
                    color={C.accent}
                    onClick={() => handleSetStatus('EN_COURS')}
                  />
                  <StatusPill
                    icon={<BookmarkIcon />}
                    label="Envie"
                    active={userGame?.status === 'ENVIE_DE_JOUER'}
                    color="#ff9800"
                    onClick={() => handleSetStatus('ENVIE_DE_JOUER')}
                  />
                  <Tooltip title="Coup de cœur" arrow>
                    <Box
                      onClick={() => handleToggleFavorite()}
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.6,
                        px: 1.4,
                        py: 0.6,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: userGame?.is_favorite
                          ? 'rgba(255,68,68,0.1)'
                          : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${userGame?.is_favorite ? 'rgba(255,68,68,0.35)' : 'transparent'}`,
                        color: userGame?.is_favorite ? '#ff4444' : C.muted,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          background: 'rgba(255,68,68,0.1)',
                          color: '#ff4444',
                        },
                      }}
                    >
                      {userGame?.is_favorite ? (
                        <FavoriteIcon sx={{ fontSize: 14, color: 'inherit' }} />
                      ) : (
                        <FavoriteBorderIcon
                          sx={{ fontSize: 14, color: 'inherit' }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontFamily: FB,
                          fontSize: 12.5,
                          fontWeight: userGame?.is_favorite ? 700 : 500,
                          color: 'inherit',
                        }}
                      >
                        Favori
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            </Box>

            {/* Boutons d'action */}
            <Box
              sx={{
                display: 'flex',
                gap: 1.5,
                flexWrap: 'wrap',
                mt: 'auto',
                pt: 0.5,
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
                sx={redBtn}
              >
                + Ajouter à la collection
              </Button>
            </Box>
          </Box>
        </Box>

        {/* ── DESCRIPTION + INFOS ── */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
            gap: 2.5,
            mb: 2.5,
          }}
        >
          <Box className="gp-c3" sx={{ ...card(), p: '26px 30px' }}>
            <Pill>Synopsis</Pill>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
            >
              <DescriptionIcon sx={{ color: C.accent, fontSize: 18 }} />
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 700,
                  fontSize: 19,
                  color: C.title,
                  letterSpacing: -0.3,
                }}
              >
                Description
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: FB,
                fontSize: 14.5,
                lineHeight: 1.8,
                color: translating ? C.muted : C.text,
                textAlign: 'justify',
              }}
            >
              {dispText}
            </Typography>
            {isTrunc && (
              <Button
                size="small"
                onClick={() => setDescriptionExpanded(p => !p)}
                sx={{
                  mt: 1.5,
                  p: 0,
                  textTransform: 'none',
                  fontFamily: FB,
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
            className="gp-c4"
            sx={{
              ...card(),
              p: '26px 30px',
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5,
            }}
          >
            {/* Genres */}
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}
              >
                <CategoryIcon sx={{ color: C.accent, fontSize: 16 }} />
                <Typography
                  sx={{
                    fontFamily: FB,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: C.light,
                  }}
                >
                  Genres
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {game.genres && game.genres.length > 0 ? (
                  game.genres.map((g: any) => (
                    <Chip
                      key={g.name}
                      label={g.name}
                      size="small"
                      icon={GMAP[g.name]}
                      sx={{
                        fontFamily: FB,
                        fontWeight: 600,
                        fontSize: 11.5,
                        backgroundColor: C.accentSoft,
                        border: `1px solid ${C.accentGlow}`,
                        color: C.accent,
                        borderRadius: '10px',
                        '& .MuiChip-icon': { color: C.accent },
                      }}
                    />
                  ))
                ) : (
                  <Typography
                    sx={{ fontFamily: FB, fontSize: 13.5, color: C.muted }}
                  >
                    Non renseigné
                  </Typography>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                height: '1px',
                background: 'rgba(0,0,0,0.05)',
                borderRadius: 99,
              }}
            />
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}
              >
                <CalendarTodayIcon sx={{ color: C.accent, fontSize: 16 }} />
                <Typography
                  sx={{
                    fontFamily: FB,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: C.light,
                  }}
                >
                  Sortie
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 700,
                  fontSize: 16,
                  color: C.title,
                  letterSpacing: -0.2,
                }}
              >
                {fd(game.release_date) || 'Non renseignée'}
              </Typography>
            </Box>
            <Box
              sx={{
                height: '1px',
                background: 'rgba(0,0,0,0.05)',
                borderRadius: 99,
              }}
            />
            <Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}
              >
                <BusinessIcon sx={{ color: C.accent, fontSize: 16 }} />
                <Typography
                  sx={{
                    fontFamily: FB,
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                    color: C.light,
                  }}
                >
                  Éditeur
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 700,
                  fontSize: 16,
                  color: C.title,
                  letterSpacing: -0.2,
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
            className="gp-c5"
            sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' }, mb: 2.5 }}
          >
            <Pill>Galerie</Pill>
            <Typography
              sx={{
                fontFamily: FD,
                fontWeight: 700,
                fontSize: 19,
                color: C.title,
                letterSpacing: -0.3,
              }}
            >
              Médias
            </Typography>
            <Sep />
            {game.videos && game.videos.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 760,
                    mx: 'auto',
                    aspectRatio: '16/9',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    boxShadow: '0 6px 28px rgba(0,0,0,0.12)',
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
                  gap: 1.5,
                  overflowX: 'auto',
                  pb: 1,
                  '&::-webkit-scrollbar': { height: 4 },
                  '&::-webkit-scrollbar-thumb': {
                    borderRadius: 99,
                    bgcolor: 'rgba(211,47,47,0.18)',
                  },
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
                      height: { xs: 130, sm: 185 },
                      minWidth: { xs: 200, sm: 295 },
                      objectFit: 'cover',
                      borderRadius: '14px',
                      boxShadow: '0 3px 12px rgba(0,0,0,0.09)',
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease,box-shadow 0.2s ease',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: '0 7px 22px rgba(0,0,0,0.13)',
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
                      borderRadius: '20px',
                      boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
                    }}
                  />
                </Box>
              </Modal>
            )}
          </Box>
        )}

        {/* ── AVIS ── */}
        <Box sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' } }}>
          <Pill>Opinions</Pill>
          <Typography
            sx={{
              fontFamily: FD,
              fontWeight: 700,
              fontSize: 19,
              color: C.title,
              letterSpacing: -0.3,
            }}
          >
            Avis de la communauté
          </Typography>
          <Sep />
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
