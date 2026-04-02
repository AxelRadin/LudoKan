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
  Divider,
  Modal,
  Paper,
  Rating,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
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

import React from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CasinoIcon from '@mui/icons-material/Casino';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExploreIcon from '@mui/icons-material/Explore';
import ExtensionIcon from '@mui/icons-material/Extension';
import BoltIcon from '@mui/icons-material/Bolt';
import EngineeringIcon from '@mui/icons-material/Engineering';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
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

const GENRE_ICON_MAP: Record<string, React.ReactElement> = {
  // IGDB (anglais)
  'Action':                            <LocalFireDepartmentIcon fontSize="small" />,
  'Adventure':                         <ExploreIcon fontSize="small" />,
  'Role-playing (RPG)':                <AutoFixHighIcon fontSize="small" />,
  'Shooter':                           <GpsFixedIcon fontSize="small" />,
  'Strategy':                          <PsychologyIcon fontSize="small" />,
  'Real Time Strategy (RTS)':          <PsychologyIcon fontSize="small" />,
  'Turn-based strategy (TBS)':         <PsychologyIcon fontSize="small" />,
  'Tactical':                          <PsychologyIcon fontSize="small" />,
  'Simulation':                        <EngineeringIcon fontSize="small" />,
  'Simulator':                         <EngineeringIcon fontSize="small" />,
  'Indie':                             <PaletteIcon fontSize="small" />,
  'Puzzle':                            <ExtensionIcon fontSize="small" />,
  'Racing':                            <DirectionsCarIcon fontSize="small" />,
  'Sport':                             <SportsSoccerIcon fontSize="small" />,
  "Hack and slash/Beat 'em up":        <BoltIcon fontSize="small" />,
  'Platform':                          <StairsIcon fontSize="small" />,
  'Music':                             <MusicNoteIcon fontSize="small" />,
  'Card & Board Game':                 <CasinoIcon fontSize="small" />,
  'Point-and-click':                   <MenuBookIcon fontSize="small" />,
  'Visual Novel':                      <MenuBookIcon fontSize="small" />,
  'Massively Multiplayer Online (MMO)':<GroupsIcon fontSize="small" />,
  'MOBA':                              <GroupsIcon fontSize="small" />,
  'Fighting':                          <SportsMartialArtsIcon fontSize="small" />,
  'Arcade':                            <SportsEsportsIcon fontSize="small" />,
  // Django (français)
  'Aventure':                          <ExploreIcon fontSize="small" />,
  'RPG':                               <AutoFixHighIcon fontSize="small" />,
  'FPS':                               <GpsFixedIcon fontSize="small" />,
  'TPS':                               <GpsFixedIcon fontSize="small" />,
  'Stratégie':                         <PsychologyIcon fontSize="small" />,
  'Course':                            <DirectionsCarIcon fontSize="small" />,
  "Hack'n Slash":                      <BoltIcon fontSize="small" />,
  'Plateforme':                        <StairsIcon fontSize="small" />,
  'Jeu de cartes':                     <CasinoIcon fontSize="small" />,
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
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
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
      .then((reviews: any[]) => {
        const myReview = reviews.find((r: any) => r.user?.id === currentUserId);
        setUserReview(myReview || null);
      })
      .catch(() => setUserReview(null));
  }, [djangoId, isAuthenticated]);

  async function ensureDjangoId(): Promise<number | null> {
    if (djangoId) return djangoId;
    if (!game) return null;
    try {
      const { game_id, normalized_game } = await resolveGameIdIfNeeded(game);
      setDjangoId(game_id);
      setGame(normalized_game);
      if (normalized_game.user_library) {
        setUserGame(normalized_game.user_library);
      }
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

  if (gameNotFound) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="h5">
          Jeu introuvable dans notre base de données.
        </Typography>
      </Box>
    );
  }

  if (!game) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="h5">Chargement du jeu...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffd3d3',
        px: { xs: 1, sm: 4, md: 10, lg: 25 },
      }}
    >
      <Box
        component="main"
        sx={{
          flex: 1,
          pt: { xs: 2, sm: 4, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 1400,
            mt: { xs: 2, md: 0 },
            mx: 'auto',
            width: '100%',
            boxSizing: 'border-box',
            bgcolor: '#fafafa',
            p: { xs: 2, sm: 4, md: 6 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              position: 'relative',
              borderRadius: 3,
              mb: 4,
              py: { xs: 2, md: 4 },
              px: { xs: 2, md: 6 },
              textAlign: 'center',
              boxShadow: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 90,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                backgroundImage: `linear-gradient(to right, black 20%, transparent 30%, transparent 70%, black 80%),url(${getHighResImage(
                  game.cover_url
                )})`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundColor: 'black',
                filter: 'brightness(0.8) blur(1px)',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex: 1,
              }}
            />
            <Typography
              variant="h3"
              sx={{
                letterSpacing: 1,
                position: 'relative',
              }}
            >
              <span
                style={{
                  WebkitTextStroke: '2px #fff',
                  WebkitTextFillColor: '#fff',
                  color: '#fff',
                  padding: '0 8px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.25)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}
              >
                {game.name}
              </span>
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: { xs: 'center', md: 'stretch' },
              width: '100%',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: { xs: '100%', md: 350 },
                mr: { md: 4 },
                mb: { xs: 2, md: 0 },
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: { xs: 220, sm: 300, md: 400 },
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 2,
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0,0,0,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleToggleFavorite()}
                  >
                    <Tooltip title="Coup de cœur" arrow>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {userGame?.is_favorite ? (
                          <FavoriteIcon sx={{ color: '#ff1744' }} />
                        ) : (
                          <FavoriteBorderIcon sx={{ color: '#ffffff' }} />
                        )}
                      </Box>
                    </Tooltip>
                  </Box>
                </Box>
                <img
                  src={getHighResImage(game.cover_url)}
                  alt={game.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: 16,
                  }}
                />
              </Box>
              <Box
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  mt: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Notes de la communauté
                </Typography>
                <Rating
                  value={(game.average_rating || game.rating_avg || 0) / 2}
                  readOnly
                  precision={0.5}
                  sx={{ mb: 2, fontSize: 40 }}
                />
                <Box
                  sx={{
                    width: '100%',
                    mt: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon
                      color={
                        userGame?.status === 'TERMINE' ? 'success' : 'action'
                      }
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSetStatus('TERMINE')}
                    />
                    <Typography variant="body2">Terminé</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BookmarkIcon
                      color={
                        userGame?.status === 'ENVIE_DE_JOUER'
                          ? 'warning'
                          : 'action'
                      }
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSetStatus('ENVIE_DE_JOUER')}
                    />
                    <Typography variant="body2">Envie d'y jouer</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PlayCircleIcon
                      color={
                        userGame?.status === 'EN_COURS' ? 'primary' : 'action'
                      }
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleSetStatus('EN_COURS')}
                    />
                    <Typography variant="body2">En cours</Typography>
                  </Box>
                  <Tooltip title="Coup de cœur" arrow>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleFavorite()}
                    >
                      {userGame?.is_favorite ? (
                        <FavoriteIcon color="error" />
                      ) : (
                        <FavoriteBorderIcon color="action" />
                      )}
                      <Typography variant="body2">Coup de cœur</Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
            <Box
              sx={{
                flex: 1.2,
                pr: { md: 6 },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                minWidth: 0,
                mt: { xs: 4, md: 0 },
              }}
            >
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <DevicesIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Plateformes
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <PlatformLogos platforms={game.platforms ?? []} />
              </Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <DescriptionIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Description
                </Typography>
              </Box>
              {(() => {
                const fullText = translating
                  ? 'Traduction en cours…'
                  : (translatedDescription ??
                    game.summary ??
                    'Aucune description disponible.');
                const isTruncatable =
                  !translating && fullText.length > DESCRIPTION_LIMIT;
                const displayText =
                  isTruncatable && !descriptionExpanded
                    ? fullText.slice(0, DESCRIPTION_LIMIT) + '…'
                    : fullText;
                return (
                  <>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: isTruncatable ? 1 : 3,
                        color: translating ? 'text.secondary' : 'text.primary',
                        textAlign: 'justify',
                      }}
                    >
                      {displayText}
                    </Typography>
                    {isTruncatable && (
                      <Button
                        size="small"
                        onClick={() => setDescriptionExpanded(prev => !prev)}
                        sx={{ mb: 3, p: 0, textTransform: 'none' }}
                      >
                        {descriptionExpanded ? 'Voir moins' : 'Voir plus'}
                      </Button>
                    )}
                  </>
                );
              })()}
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <CategoryIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Genres
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {game.genres && game.genres.length > 0
                  ? game.genres.map((g: any) => (
                      <Chip
                        key={g.name}
                        label={g.name}
                        size="small"
                        icon={GENRE_ICON_MAP[g.name]}
                        sx={{ fontWeight: 600 }}
                      />
                    ))
                  : <Typography variant="body1">Non renseigné</Typography>}
              </Box>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <CalendarTodayIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Date de sortie
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {formatDate(game.release_date) || 'Non renseignée'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <BusinessIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Éditeur
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.publisher?.name || 'Non renseigné'}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: { xs: 'center', sm: 'flex-end' },
              alignItems: 'center',
              gap: 2,
              mt: 3,
              maxWidth: 1400,
              mx: 'auto',
              width: '100%',
            }}
          >
            <SecondaryButton
              onClick={() => handleSetMatchmaking()}
              disabled={isMatching}
            >
              {isMatching ? 'Recherche...' : 'Matchmaking'}
            </SecondaryButton>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleSetStatus('ENVIE_DE_JOUER')}
            >
              Ajouter à la collection
            </Button>
          </Box>
          {((game.screenshots && game.screenshots.length > 0) || (game.videos && game.videos.length > 0)) && (
            <>
              <Divider sx={{ my: 4 }} />
              <Box sx={{ width: '100%' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, textAlign: 'center' }}>
                  Médias
                </Typography>
                {game.videos && game.videos.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Trailer
                    </Typography>
                    <Box
                      sx={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: 800,
                        mx: 'auto',
                        aspectRatio: '16/9',
                        borderRadius: 2,
                        overflow: 'hidden',
                        boxShadow: 3,
                      }}
                    >
                      <iframe
                        src={`https://www.youtube.com/embed/${game.videos[0].video_id}`}
                        title={game.videos[0].name || 'Trailer'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                      />
                    </Box>
                  </Box>
                )}
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
                      }}
                    >
                      <Box
                        component="img"
                        src={selectedScreenshot}
                        alt="Screenshot agrandi"
                        sx={{
                          maxWidth: '90vw',
                          maxHeight: '90vh',
                          borderRadius: 2,
                          boxShadow: 8,
                        }}
                      />
                    </Box>
                  </Modal>
                )}
                {game.screenshots && game.screenshots.length > 0 && (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      Screenshots
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        gap: 2,
                        overflowX: 'auto',
                        pb: 1,
                        '&::-webkit-scrollbar': { height: 6 },
                        '&::-webkit-scrollbar-thumb': { borderRadius: 3, bgcolor: 'rgba(0,0,0,0.2)' },
                      }}
                    >
                      {game.screenshots.map((s: any, i: number) => (
                        <Box
                          key={i}
                          component="img"
                          src={s.url}
                          alt={`Screenshot ${i + 1}`}
                          onClick={() => setSelectedScreenshot(s.url)}
                          sx={{
                            height: { xs: 140, sm: 200 },
                            minWidth: { xs: 220, sm: 320 },
                            objectFit: 'cover',
                            borderRadius: 2,
                            boxShadow: 2,
                            flexShrink: 0,
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </>
          )}
          <Divider sx={{ my: 4 }} />
          <Box
            sx={{
              width: '100%',
              bgcolor: '#fff',
              borderRadius: 4,
              p: { xs: 2, sm: 4 },
            }}
          >
            <ReviewSection
              gameId={djangoId ? String(djangoId) : ''}
              userReview={userReview}
              currentUserId={currentUserId}
              onReviewChange={review => setUserReview(review)}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
