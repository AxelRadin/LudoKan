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
import { useTheme } from '@mui/material/styles';

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

(() => {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
    .gp-img { animation: scaleIn 0.7s cubic-bezier(0.22,1,0.36,1) both }
    .gp-c0  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both }
    .gp-c1  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.16s both }
    .gp-c2  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.24s both }
    .gp-c3  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.32s both }
    .gp-c4  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.40s both }
    .gp-c5  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.48s both }
    .gp-c6  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.56s both }
  `;
  document.head.appendChild(s);
})();

const F = "'Outfit', sans-serif";

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

const hi = (u: string | null) =>
  u ? u.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p') : '';
const fdate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '';

function SectionLabel({ label }: { label: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#ef5350' : '#d43c3c';

  return (
    <Box sx={{ position: 'relative', pl: '14px', mb: 2 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: '80%',
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
          borderRadius: '2px',
          opacity: 0.8,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{ width: 14, height: '1px', background: accent, opacity: 0.6 }}
        />
        <Typography
          sx={{
            fontFamily: F,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.9,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

function Sep() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        height: '1px',
        my: 2,
        background: isDark
          ? 'linear-gradient(to right, rgba(239,83,80,0.3), rgba(239,83,80,0.1), transparent)'
          : 'linear-gradient(to right, rgba(198,40,40,0.2), rgba(198,40,40,0.06), transparent)',
        borderRadius: 99,
      }}
    />
  );
}

function StatusChip({
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
        px: 1.5,
        py: 0.7,
        borderRadius: '12px',
        cursor: 'pointer',
        background: active ? `${color}18` : 'rgba(0,0,0,0.03)',
        border: `1px solid ${active ? `${color}40` : 'rgba(0,0,0,0.06)'}`,
        color: active ? color : '#b49393',
        transition: 'all 0.18s ease',
        '&:hover': {
          background: `${color}14`,
          borderColor: `${color}35`,
          color,
          transform: 'translateY(-1px)',
        },
      }}
    >
      {React.cloneElement(icon, {
        sx: { fontSize: 14, color: 'inherit' },
      } as any)}
      <Typography
        sx={{
          fontFamily: F,
          fontSize: 12.5,
          fontWeight: active ? 700 : 500,
          color: 'inherit',
          lineHeight: 1,
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
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const accent = isDark ? '#ef5350' : '#d43c3c';
  const accentDark = isDark ? '#c62828' : '#b71c1c';
  const accentSoft = isDark ? 'rgba(239,83,80,0.12)' : 'rgba(198,40,40,0.08)';
  const accentGlow = isDark ? 'rgba(239,83,80,0.25)' : 'rgba(198,40,40,0.15)';
  const ink = isDark ? '#f5e6e6' : '#241818';
  const muted = isDark ? '#9e7070' : '#b49393';
  const cardBg = isDark ? 'rgba(40,20,20,0.65)' : 'rgba(255,255,255,0.80)';
  const cardBorder = isDark ? 'rgba(239,83,80,0.14)' : 'rgba(198,40,40,0.10)';

  const card = (ov: Record<string, unknown> = {}) => ({
    background: cardBg,
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: `1px solid ${cardBorder}`,
    borderRadius: '20px',
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30)'
      : '0 4px 24px rgba(198,40,40,0.06)',
    transition:
      'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease, border-color 0.22s ease',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 20,
      right: 20,
      height: '1px',
      background: `linear-gradient(to right, ${accent} 0%, transparent 60%)`,
      opacity: isDark ? 0.5 : 0.35,
    },
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: isDark ? 'rgba(239,83,80,0.28)' : 'rgba(198,40,40,0.22)',
      boxShadow: isDark
        ? '0 12px 36px rgba(239,83,80,0.12)'
        : '0 12px 36px rgba(198,40,40,0.10)',
    },
    ...ov,
  });

  const noHov = { '&:hover': { transform: 'none' } };

  const [game, setGame] = useState<NormalizedGame | null>(null);
  const [gameNotFound, setGameNotFound] = useState(false);
  const [djangoId, setDjangoId] = useState<number | null>(null);
  const [userGame, setUserGame] = useState<UserLibraryData | null>(null);
  const [userReview, setUserReview] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [translatedDesc, setTranslatedDesc] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const DLIMIT = 220;

  useEffect(() => {
    (async () => {
      try {
        if (igdbId) {
          const igdbGame = await fetchIgdbGameById(Number(igdbId));
          setGame(igdbGame);
          if (igdbGame.django_id) {
            setDjangoId(igdbGame.django_id);
            if (igdbGame.user_library) {
              setUserGame(igdbGame.user_library);
            }
          }
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
    setTranslatedDesc(null);
    translateDescription(game.summary)
      .then(setTranslatedDesc)
      .catch(() => {})
      .finally(() => setTranslating(false));
  }, [game?.summary]);

  useEffect(() => {
    if (!isAuthenticated || !djangoId) {
      setCurrentUserId(null);
      setUserReview(null);
      return;
    }
    (async () => {
      try {
        const m: { id: number } = await apiGet('/api/me');
        setCurrentUserId(m.id);
        const d: any = await apiGet(`/api/reviews/?game=${djangoId}`);
        const l = Array.isArray(d) ? d : (d.results ?? []);
        setUserReview(l.find((r: any) => r.user?.id === m.id) || null);
      } catch {
        setCurrentUserId(null);
        setUserReview(null);
      }
    })();
  }, [djangoId, isAuthenticated]);

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
          background: isDark ? '#1a1010' : '#fdf4f4',
        }}
      >
        <Typography
          sx={{ fontFamily: F, fontWeight: 700, fontSize: 22, color: ink }}
        >
          {gameNotFound ? 'Jeu introuvable.' : 'Chargement…'}
        </Typography>
      </Box>
    );
  }

  const fullText = translating
    ? 'Traduction en cours…'
    : (translatedDesc ?? game.summary ?? 'Aucune description disponible.');
  const isTrunc = !translating && fullText.length > DLIMIT;
  const dispText =
    isTrunc && !descExpanded ? fullText.slice(0, DLIMIT) + '…' : fullText;

  const redBtnSx = {
    borderRadius: '12px',
    px: 2.5,
    py: 1,
    fontWeight: 700,
    fontSize: 13,
    textTransform: 'none' as const,
    fontFamily: F,
    background: `linear-gradient(135deg, ${accent} 0%, #ef5350 100%)`,
    boxShadow: `0 4px 16px rgba(211,47,47,0.32)`,
    '&:hover': {
      background: `linear-gradient(135deg, ${accentDark} 0%, ${accent} 100%)`,
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 22px rgba(211,47,47,0.42)`,
    },
    transition: 'all 0.2s ease',
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: F,
        background: isDark
          ? `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 28%),
              radial-gradient(circle at 86% 16%, rgba(120,20,20,0.18) 0%, transparent 28%),
              radial-gradient(circle at 78% 84%, rgba(198,40,40,0.07) 0%, transparent 24%),
              linear-gradient(180deg, #1a1010 0%, #221414 55%, #1e1212 100%)
            `
          : `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E"),
              radial-gradient(ellipse 120% 80% at 0% 0%, rgba(255,255,255,0.92) 0%, transparent 46%),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 24%),
              radial-gradient(circle at 86% 16%, rgba(255,210,210,0.80) 0%, transparent 26%),
              radial-gradient(circle at 78% 84%, rgba(198,40,40,0.08) 0%, transparent 24%),
              linear-gradient(180deg, #fdf4f4 0%, #f9ecec 55%, #fef6f6 100%)
            `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1140, mx: 'auto' }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '340px 1fr' },
            gap: 2.5,
            mb: 2.5,
            alignItems: 'stretch',
          }}
        >
          {/* ── IMAGE ── */}
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

            <Tooltip title="Coup de cœur" arrow>
              <Box
                onClick={() => handleToggleFavorite()}
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
                {userGame?.is_favorite ? (
                  <FavoriteIcon sx={{ color: accent, fontSize: 17 }} />
                ) : (
                  <FavoriteBorderIcon
                    sx={{ color: 'rgba(255,255,255,0.9)', fontSize: 17 }}
                  />
                )}
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
              {game.genres && game.genres.length > 0 && (
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
                      fontFamily: F,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: 1.8,
                      textTransform: 'uppercase',
                      color: '#fff',
                    }}
                  >
                    {game.genres[0].name}
                  </Typography>
                </Box>
              )}
              <Typography
                sx={{
                  fontFamily: F,
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
                {game.publisher?.name && (
                  <Typography
                    sx={{
                      fontFamily: F,
                      fontSize: 12,
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
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.4)',
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: F,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {fdate(game.release_date)}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>
          </Box>

          {/* ── COLONNE DROITE ── */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box className="gp-c0" sx={{ ...card(), px: 2.5, py: 2.5 }}>
              <SectionLabel label="Actions" />
              <Box
                sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2.5 }}
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
                  sx={redBtnSx}
                >
                  + Ajouter à la collection
                </Button>
              </Box>
              <Sep />
              <SectionLabel label="Mon statut" />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                <StatusChip
                  icon={<CheckCircleIcon />}
                  label="Terminé"
                  active={userGame?.status === 'TERMINE'}
                  color="#43a047"
                  onClick={() => handleSetStatus('TERMINE')}
                />
                <StatusChip
                  icon={<PlayCircleIcon />}
                  label="En cours"
                  active={userGame?.status === 'EN_COURS'}
                  color={accent}
                  onClick={() => handleSetStatus('EN_COURS')}
                />
                <StatusChip
                  icon={<BookmarkIcon />}
                  label="Envie"
                  active={userGame?.status === 'ENVIE_DE_JOUER'}
                  color="#fb8c00"
                  onClick={() => handleSetStatus('ENVIE_DE_JOUER')}
                />
                <Tooltip title="Coup de cœur" arrow>
                  <Box
                    onClick={() => handleToggleFavorite()}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.6,
                      px: 1.5,
                      py: 0.7,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      background: userGame?.is_favorite
                        ? 'rgba(255,61,61,0.12)'
                        : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${userGame?.is_favorite ? 'rgba(255,61,61,0.35)' : 'rgba(0,0,0,0.06)'}`,
                      color: userGame?.is_favorite ? accent : muted,
                      transition: 'all 0.18s ease',
                      '&:hover': {
                        background: 'rgba(255,61,61,0.10)',
                        color: accent,
                        transform: 'translateY(-1px)',
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
                        fontFamily: F,
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

            <Box className="gp-c1" sx={{ ...card(), px: 2.5, py: 2.5 }}>
              <SectionLabel label="Plateformes" />
              <PlatformLogos platforms={game.platforms ?? []} />
            </Box>

            <Box className="gp-c2" sx={{ ...card(), px: 2.5, py: 2.5 }}>
              <SectionLabel label="Genres" />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
                {game.genres && game.genres.length > 0 ? (
                  game.genres.map((g: any) => (
                    <Chip
                      key={g.name}
                      label={g.name}
                      size="small"
                      icon={GMAP[g.name]}
                      sx={{
                        fontFamily: F,
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
                    sx={{ fontFamily: F, fontSize: 13, color: muted }}
                  >
                    Non renseigné
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              className="gp-c3"
              sx={{ ...card(), px: 2.5, py: 2.5, flex: 1 }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
              >
                <DescriptionIcon sx={{ color: accent, fontSize: 16 }} />
                <Typography
                  sx={{
                    fontFamily: F,
                    fontWeight: 700,
                    fontSize: 15,
                    color: ink,
                    letterSpacing: -0.2,
                  }}
                >
                  Description
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: F,
                  fontSize: 13.5,
                  lineHeight: 1.85,
                  color: translating ? muted : ink,
                }}
              >
                {dispText}
              </Typography>
              {isTrunc && (
                <Button
                  size="small"
                  onClick={() => setDescExpanded(p => !p)}
                  sx={{
                    mt: 1,
                    p: 0,
                    textTransform: 'none',
                    fontFamily: F,
                    fontWeight: 600,
                    color: accent,
                    fontSize: 12,
                  }}
                >
                  {descExpanded ? 'Voir moins ↑' : 'Voir plus ↓'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* ── DATE / ÉDITEUR ── */}
        <Box className="gp-c4" sx={{ ...card(), px: 3, py: 2.5, mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
            <Box>
              <SectionLabel label="Sortie" />
              <Typography
                sx={{
                  fontFamily: F,
                  fontWeight: 700,
                  fontSize: 16,
                  color: ink,
                }}
              >
                {fdate(game.release_date) || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <SectionLabel label="Éditeur" />
              <Typography
                sx={{
                  fontFamily: F,
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

        {/* ── NOTE ── */}
        <Box className="gp-c4" sx={{ ...card(), px: 3, py: 2.5, mb: 2 }}>
          <SectionLabel label="Note communauté" />
          <Rating
            value={(game.average_rating || game.rating_avg || 0) / 2}
            readOnly
            precision={0.5}
            sx={{
              fontSize: 24,
              mt: 0.5,
              '& .MuiRating-iconFilled': { color: accent },
            }}
          />
        </Box>

        {/* ── MÉDIAS ── */}
        {((game.screenshots && game.screenshots.length > 0) ||
          (game.videos && game.videos.length > 0)) && (
          <Box
            className="gp-c5"
            sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' }, mb: 2 }}
          >
            <SectionLabel label="Galerie" />
            <Typography
              sx={{
                fontFamily: F,
                fontWeight: 700,
                fontSize: 18,
                color: ink,
                letterSpacing: -0.3,
                mb: 0.5,
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
                    maxWidth: '100%',
                    aspectRatio: '16/9',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: `0 8px 28px rgba(0,0,0,0.14), 0 0 0 1px ${accentGlow}`,
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
                    bgcolor: accentGlow,
                  },
                }}
              >
                {game.screenshots.map(s => (
                  <Box
                    key={s.url}
                    component="img"
                    src={s.url}
                    alt={game.name ? `Capture — ${game.name}` : 'Capture'}
                    onClick={() => setSelectedShot(s.url)}
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
                        boxShadow: `0 8px 24px rgba(198,40,40,0.15)`,
                      },
                    }}
                  />
                ))}
              </Box>
            )}

            {selectedShot && (
              <Modal open onClose={() => setSelectedShot(null)}>
                <Box
                  onClick={() => setSelectedShot(null)}
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
                    src={selectedShot}
                    alt="Screenshot agrandi"
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
        )}

        {/* ── AVIS ── */}
        <Box sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' } }}>
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
