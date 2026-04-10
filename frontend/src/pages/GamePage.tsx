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
(() => {
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href =
    'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500;600;700&display=swap';
  document.head.appendChild(l);
})();

/* ── Keyframes ── */
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

/* ── Tokens ── */
const C = {
  pageBg: '#ffd3d3',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  accentSoft: 'rgba(211,47,47,0.08)',
  accentGlow: 'rgba(211,47,47,0.18)',
  title: '#0f0f0f',
  text: '#2b2b2b',
  muted: '#6e6e73',
  light: '#b0b0b8',
  w88: 'rgba(255,255,255,0.88)',
  w95: 'rgba(255,255,255,0.95)',
  divider: 'rgba(0,0,0,0.05)',
};
const FD = "'Playfair Display', Georgia, serif";
const FB = "'DM Sans', system-ui, sans-serif";

/* ── Glass card ── */
const card = (ov: Record<string, unknown> = {}) => ({
  background: C.w88,
  backdropFilter: 'blur(28px) saturate(170%)',
  WebkitBackdropFilter: 'blur(28px) saturate(170%)',
  border: `1px solid ${C.w95}`,
  borderRadius: '22px',
  boxShadow:
    '0 2px 16px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,0.92)',
  transition:
    'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease',
  '&:hover': {
    transform: 'translateY(-3px)',
    boxShadow: '0 10px 32px rgba(0,0,0,0.09)',
  },
  ...ov,
});
const noHov = {
  '&:hover': {
    transform: 'none',
    boxShadow:
      '0 2px 16px rgba(0,0,0,0.055), inset 0 1px 0 rgba(255,255,255,0.92)',
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

const hi = (u: string | null) =>
  u ? u.replace('t_thumb', 't_1080p').replace('t_cover_big', 't_1080p') : '';
const fdate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '';

/* ── Pill tag ── */
function Pill({ children }: Readonly<{ children: React.ReactNode }>) {
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

/* ── Thin separator ── */
function Sep() {
  return (
    <Box
      sx={{
        height: '1px',
        my: 2.5,
        background: `linear-gradient(to right,${C.accentGlow},rgba(241,199,199,0.2),transparent)`,
        borderRadius: 99,
      }}
    />
  );
}

type StatusChipProps = Readonly<{
  icon: React.ReactElement;
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}>;

/* ── Compact status chip ── */
function StatusChip({ icon, label, active, color, onClick }: StatusChipProps) {
  const borderColor = active ? `${color}38` : 'transparent';
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.3,
        py: 0.55,
        borderRadius: '11px',
        cursor: 'pointer',
        background: active ? `${color}15` : 'rgba(0,0,0,0.035)',
        border: '1px solid ' + borderColor,
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
        sx: { fontSize: 13, color: 'inherit' },
      } as any)}
      <Typography
        sx={{
          fontFamily: FB,
          fontSize: 12,
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

type InfoRowProps = Readonly<{
  label: string;
  children: React.ReactNode;
}>;

/* ── Info row (label + valeur, sans icône) ── */
function InfoRow({ label, children }: InfoRowProps) {
  return (
    <Box>
      <Typography
        sx={{
          fontFamily: FB,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: C.light,
          lineHeight: 1,
          mb: 0.4,
        }}
      >
        {label}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

const DLIMIT = 220;

const redBtnSx = {
  borderRadius: 999,
  px: 2.5,
  py: 1,
  fontWeight: 700,
  fontSize: 13,
  textTransform: 'none' as const,
  fontFamily: FB,
  background: `linear-gradient(135deg,${C.accent} 0%,#ef5350 100%)`,
  boxShadow: `0 4px 16px rgba(211,47,47,0.36)`,
  '&:hover': {
    background: `linear-gradient(135deg,${C.accentDark} 0%,${C.accent} 100%)`,
    transform: 'translateY(-2px)',
    boxShadow: `0 8px 22px rgba(211,47,47,0.42)`,
  },
  transition: 'all 0.2s ease',
};

function GamePagePlaceholder({
  gameNotFound,
}: Readonly<{ gameNotFound: boolean }>) {
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

type GamePageContentProps = Readonly<{
  game: NormalizedGame;
  djangoId: number | null;
  userGame: UserLibraryData | null;
  userReview: any;
  currentUserId: number | null;
  translatedDesc: string | null;
  translating: boolean;
  descExpanded: boolean;
  setDescExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  selectedShot: string | null;
  setSelectedShot: React.Dispatch<React.SetStateAction<string | null>>;
  isMatching: boolean;
  ensureDjangoId: () => Promise<number | null>;
  handleSetStatus: (
    s: 'EN_COURS' | 'TERMINE' | 'ENVIE_DE_JOUER',
    p?: boolean
  ) => Promise<void>;
  handleToggleFavorite: (p?: boolean) => Promise<void>;
  handleSetMatchmaking: (p?: boolean) => Promise<void>;
  setUserReview: React.Dispatch<React.SetStateAction<any>>;
}>;

function gameHasMedia(g: NormalizedGame): boolean {
  return (g.screenshots?.length ?? 0) > 0 || (g.videos?.length ?? 0) > 0;
}

function GameHeroLeftColumn({
  game,
  userGame,
  onToggleFavorite,
}: Readonly<{
  game: NormalizedGame;
  userGame: UserLibraryData | null;
  onToggleFavorite: () => void;
}>) {
  return (
    <Box
      className="gp-img"
      sx={{
        position: 'relative',
        borderRadius: '28px',
        overflow: 'hidden',
        height: { xs: 380, md: '100%' },
        minHeight: { md: 520 },
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
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
            'linear-gradient(180deg,rgba(0,0,0,0) 38%,rgba(0,0,0,0.78) 100%)',
        }}
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.18,
          pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
        }}
      />

      <Tooltip title="Coup de cœur" arrow>
        <Box
          onClick={onToggleFavorite}
          sx={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 4,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(10,10,10,0.5)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.18s ease,background 0.18s ease',
            '&:hover': {
              transform: 'scale(1.12)',
              background: 'rgba(10,10,10,0.7)',
            },
          }}
        >
          {userGame?.is_favorite ? (
            <FavoriteIcon sx={{ color: '#ff3d3d', fontSize: 17 }} />
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
          p: '20px 22px 22px',
        }}
      >
        {game.genres && game.genres.length > 0 && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              px: 1.2,
              py: 0.3,
              mb: 1,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            <Typography
              sx={{
                fontFamily: FB,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.9)',
              }}
            >
              {game.genres[0].name}
            </Typography>
          </Box>
        )}
        <Typography
          sx={{
            fontFamily: FD,
            fontWeight: 900,
            fontSize: { xs: 24, md: 28 },
            color: '#fff',
            lineHeight: 1.05,
            letterSpacing: -0.8,
            textShadow: '0 2px 18px rgba(0,0,0,0.6)',
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
                fontFamily: FB,
                fontSize: 12,
                color: 'rgba(255,255,255,0.72)',
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
                  fontFamily: FB,
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
  );
}

function GameMediaGallery({
  game,
  selectedShot,
  setSelectedShot,
}: Readonly<{
  game: NormalizedGame;
  selectedShot: string | null;
  setSelectedShot: React.Dispatch<React.SetStateAction<string | null>>;
}>) {
  return (
    <Box
      className="gp-c5"
      sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' }, mb: 2.5 }}
    >
      <Pill>Galerie</Pill>
      <Typography
        sx={{
          fontFamily: FD,
          fontWeight: 700,
          fontSize: 18,
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
              boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
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
              bgcolor: 'rgba(211,47,47,0.2)',
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
                borderRadius: '14px',
                boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s ease,box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 7px 20px rgba(0,0,0,0.13)',
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
              bgcolor: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(12px)',
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
                borderRadius: '18px',
                boxShadow: '0 28px 80px rgba(0,0,0,0.55)',
              }}
            />
          </Box>
        </Modal>
      )}
    </Box>
  );
}

function GamePageContent({
  game,
  djangoId,
  userGame,
  userReview,
  currentUserId,
  translatedDesc,
  translating,
  descExpanded,
  setDescExpanded,
  selectedShot,
  setSelectedShot,
  isMatching,
  ensureDjangoId,
  handleSetStatus,
  handleToggleFavorite,
  handleSetMatchmaking,
  setUserReview,
}: GamePageContentProps) {
  const fullText = translating
    ? 'Traduction en cours…'
    : (translatedDesc ?? game.summary ?? 'Aucune description disponible.');
  const isTrunc = !translating && fullText.length > DLIMIT;
  const dispText =
    isTrunc && !descExpanded ? fullText.slice(0, DLIMIT) + '…' : fullText;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: FB,
        background: `
        url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
        radial-gradient(ellipse 140% 90% at 8% -10%,rgba(255,185,185,0.75) 0%,transparent 52%),
        radial-gradient(ellipse 80% 60% at 95% 105%,rgba(211,47,47,0.08) 0%,transparent 48%),
        radial-gradient(ellipse 55% 45% at 55% 65%,rgba(255,215,215,0.38) 0%,transparent 58%),
        ${C.pageBg}
      `,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1140, mx: 'auto' }}>
        {/* ══════════════════════════════════════════════════════
            HERO : image portrait gauche | colonne droite
        ══════════════════════════════════════════════════════ */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '380px 1fr' },
            gap: 2.5,
            mb: 2.5,
            alignItems: 'stretch',
          }}
        >
          <GameHeroLeftColumn
            game={game}
            userGame={userGame}
            onToggleFavorite={() => handleToggleFavorite()}
          />

          {/* ══ COLONNE DROITE ══ */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* ── Ligne 1 : Boutons + Statut côte à côte ── */}
            <Box className="gp-c0" sx={{ ...card(), px: 2.5, py: 2 }}>
              {/* Boutons */}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
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
              {/* Statut inline */}
              <Box
                sx={{
                  height: '1px',
                  background: C.divider,
                  borderRadius: 99,
                  mb: 1.75,
                }}
              />
              <InfoRow label="Mon statut">
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.65, mt: 0.4 }}
                >
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
                    color={C.accent}
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
                        px: 1.3,
                        py: 0.55,
                        borderRadius: '11px',
                        cursor: 'pointer',
                        background: userGame?.is_favorite
                          ? 'rgba(255,61,61,0.12)'
                          : 'rgba(0,0,0,0.035)',
                        border: `1px solid ${userGame?.is_favorite ? 'rgba(255,61,61,0.35)' : 'transparent'}`,
                        color: userGame?.is_favorite ? '#ff3d3d' : C.muted,
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          background: 'rgba(255,61,61,0.1)',
                          color: '#ff3d3d',
                        },
                      }}
                    >
                      {userGame?.is_favorite ? (
                        <FavoriteIcon sx={{ fontSize: 13, color: 'inherit' }} />
                      ) : (
                        <FavoriteBorderIcon
                          sx={{ fontSize: 13, color: 'inherit' }}
                        />
                      )}
                      <Typography
                        sx={{
                          fontFamily: FB,
                          fontSize: 12,
                          fontWeight: userGame?.is_favorite ? 700 : 500,
                          color: 'inherit',
                        }}
                      >
                        Favori
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </InfoRow>
            </Box>

            {/* ── Card Plateformes ── */}
            <Box className="gp-c1" sx={{ ...card(), px: 2.5, py: 2 }}>
              <InfoRow label="Plateformes">
                <PlatformLogos platforms={game.platforms ?? []} />
              </InfoRow>
            </Box>

            {/* ── Card Genres ── */}
            <Box className="gp-c2" sx={{ ...card(), px: 2.5, py: 2 }}>
              <InfoRow label="Genres">
                <Box
                  sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 0.2 }}
                >
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
                          fontSize: 11,
                          backgroundColor: C.accentSoft,
                          border: `1px solid ${C.accentGlow}`,
                          color: C.accent,
                          borderRadius: '9px',
                          '& .MuiChip-icon': { color: C.accent },
                        }}
                      />
                    ))
                  ) : (
                    <Typography
                      sx={{ fontFamily: FB, fontSize: 13, color: C.muted }}
                    >
                      Non renseigné
                    </Typography>
                  )}
                </Box>
              </InfoRow>
            </Box>

            {/* ── Card Description ── */}
            <Box className="gp-c3" sx={{ ...card(), px: 2.5, py: 2, flex: 1 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}
              >
                <DescriptionIcon sx={{ color: C.accent, fontSize: 16 }} />
                <Typography
                  sx={{
                    fontFamily: FD,
                    fontWeight: 700,
                    fontSize: 16,
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
                  fontSize: 13.5,
                  lineHeight: 1.8,
                  color: translating ? C.muted : C.text,
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
                    fontFamily: FB,
                    fontWeight: 600,
                    color: C.accent,
                    fontSize: 12,
                  }}
                >
                  {descExpanded ? 'Voir moins ↑' : 'Voir plus ↓'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>

        {/* ── DATE / ÉDITEUR (pleine largeur) ── */}
        <Box className="gp-c4" sx={{ ...card(), px: 2.5, py: 2, mb: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <InfoRow label="Sortie">
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 700,
                  fontSize: 15,
                  color: C.title,
                  letterSpacing: -0.2,
                }}
              >
                {fdate(game.release_date) || 'N/A'}
              </Typography>
            </InfoRow>
            <InfoRow label="Éditeur">
              <Typography
                sx={{
                  fontFamily: FD,
                  fontWeight: 700,
                  fontSize: 15,
                  color: C.title,
                  letterSpacing: -0.2,
                }}
              >
                {game.publisher?.name || 'N/A'}
              </Typography>
            </InfoRow>
          </Box>
        </Box>

        {/* ── NOTE COMMUNAUTÉ (pleine largeur) ── */}
        <Box className="gp-c4" sx={{ ...card(), p: '22px 30px', mb: 2.5 }}>
          <InfoRow label="Note communauté">
            <Rating
              value={(game.average_rating || game.rating_avg || 0) / 2}
              readOnly
              precision={0.5}
              sx={{
                fontSize: 22,
                mt: 0.4,
                '& .MuiRating-iconFilled': { color: C.accent },
              }}
            />
          </InfoRow>
        </Box>

        {/* ── MÉDIAS ── */}
        {gameHasMedia(game) && (
          <GameMediaGallery
            game={game}
            selectedShot={selectedShot}
            setSelectedShot={setSelectedShot}
          />
        )}

        {/* ── AVIS ── */}
        <Box sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' } }}>
          <Pill>Opinions</Pill>
          <Typography
            sx={{
              fontFamily: FD,
              fontWeight: 700,
              fontSize: 18,
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

function useGamePageModel() {
  const { id, igdbId } = useParams();
  const { isAuthenticated, setAuthModalOpen, setPendingAction } = useAuth();
  const { startMatchmaking, isMatching } = useMatchmaking();

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

  useEffect(() => {
    (async () => {
      try {
        if (igdbId) {
          const igdbGame = await fetchIgdbGameById(Number(igdbId));
          setGame(igdbGame);
          const { game_id, normalized_game } =
            await resolveGameIdIfNeeded(igdbGame);
          setDjangoId(game_id);
          setGame(normalized_game);
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

  return {
    game,
    gameNotFound,
    djangoId,
    userGame,
    userReview,
    currentUserId,
    translatedDesc,
    translating,
    descExpanded,
    setDescExpanded,
    selectedShot,
    setSelectedShot,
    isMatching,
    ensureDjangoId,
    handleSetStatus,
    handleToggleFavorite,
    handleSetMatchmaking,
    setUserReview,
  };
}

export default function GamePage() {
  const m = useGamePageModel();
  if (m.gameNotFound || !m.game) {
    return <GamePagePlaceholder gameNotFound={m.gameNotFound} />;
  }
  return (
    <GamePageContent
      game={m.game}
      djangoId={m.djangoId}
      userGame={m.userGame}
      userReview={m.userReview}
      currentUserId={m.currentUserId}
      translatedDesc={m.translatedDesc}
      translating={m.translating}
      descExpanded={m.descExpanded}
      setDescExpanded={m.setDescExpanded}
      selectedShot={m.selectedShot}
      setSelectedShot={m.setSelectedShot}
      isMatching={m.isMatching}
      ensureDjangoId={m.ensureDjangoId}
      handleSetStatus={m.handleSetStatus}
      handleToggleFavorite={m.handleToggleFavorite}
      handleSetMatchmaking={m.handleSetMatchmaking}
      setUserReview={m.setUserReview}
    />
  );
}
