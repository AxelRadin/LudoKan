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
  Divider,
  Paper,
  Rating,
  Tooltip,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchIgdbGameById,
  importIgdbGameToDjango,
  translateDescription,
} from '../api/igdb';
import FloatingMatchmakingWidget from '../components/FloatingMatchmakingWidget';
import MatchmakingModal from '../components/MatchmakingModal';
import ReviewSection from '../components/reviews/ReviewSection';
import SecondaryButton from '../components/SecondaryButton';
import { useAuth } from '../contexts/useAuth';
import { apiGet, apiPatch, apiPost } from '../services/api';

export default function GamePage() {
  const { id, igdbId } = useParams();
  const { isAuthenticated, setAuthModalOpen, setPendingAction } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [gameNotFound, setGameNotFound] = useState(false);
  const [djangoId, setDjangoId] = useState<string | null>(null);
  const [userGame, setUserGame] = useState<any>(null);
  const [userReview, setUserReview] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<
    string | null
  >(null);
  const [translating, setTranslating] = useState(false);
  const [activeRequestStartedAt, setActiveRequestStartedAt] = useState<Date | null>(null);
  const [activeRequestUntil, setActiveRequestUntil] = useState<Date | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [hasNewMatch, setHasNewMatch] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [currentRadius, setCurrentRadius] = useState<number>(20);

  useEffect(() => {
    if (igdbId) {
      fetchIgdbGameById(Number(igdbId))
        .then(normalizedData => {
          const image =
            normalizedData.cover_url?.replace('t_cover_big', 't_1080p') ??
            undefined;

          setGame({
            ...normalizedData,
            image,
            display_release_date: normalizedData.release_date
              ? new Date(normalizedData.release_date).toLocaleDateString(
                'fr-FR'
              )
              : null,
          });

          if (normalizedData.django_id) {
            setDjangoId(String(normalizedData.django_id));
          }
          if (normalizedData.user_library) {
            setUserGame(normalizedData.user_library);
          }
        })
        .catch(() => setGameNotFound(true));
    } else {
      apiGet(`/api/games/${id}/`)
        .then(data => {
          let image = data.cover_url;
          if (image && image.includes('t_thumb')) {
            image = image.replace('t_thumb', 't_1080p');
          } else if (image && image.includes('t_cover_big')) {
            image = image.replace('t_cover_big', 't_1080p');
          }
          setGame({
            ...data,
            name: data.name_fr || data.name,
            image,
            display_release_date: data.release_date
              ? new Date(data.release_date).toLocaleDateString('fr-FR')
              : null,
          });
          setDjangoId(String(data.id));
          setUserGame(data.user_library);
        })
        .catch(() => setGameNotFound(true));
    }
  }, [id, igdbId, isAuthenticated]);

  useEffect(() => {
    if (!game?.summary) return;
    setTranslating(true);
    setTranslatedDescription(null);
    translateDescription(game.summary)
      .then(setTranslatedDescription)
      .catch(() => { })
      .finally(() => setTranslating(false));
  }, [game?.summary]);

  useEffect(() => {
    if (djangoId && isAuthenticated) {
      Promise.all([apiGet(`/api/reviews/?game=${djangoId}`), apiGet('/api/me')])
        .then(([reviews, me]) => {
          setCurrentUserId(me.id);
          const myReview = reviews.find((r: any) => r.user?.id === me.id);
          setUserReview(myReview || null);
        })
        .catch(() => {
          setUserReview(null);
        });
    } else {
      setUserReview(null);
    }
  }, [djangoId, isAuthenticated]);

  useEffect(() => {
    if (!activeRequestUntil) return;

    const intervalId = setInterval(async () => {
      if (new Date() > activeRequestUntil) {
        setActiveRequestUntil(null);
        clearInterval(intervalId);
        return;
      }

      try {
        const currentMatches = await apiGet('/api/matchmaking/matches/');
        if (currentMatches.length > matches.length) {
          setMatches(currentMatches);
          setHasNewMatch(true);
        }
      } catch { console.error('Erreur lors de la vérification des nouveaux matchs'); }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [activeRequestUntil, matches.length]);

  useEffect(() => {
    if (!activeRequestId || hasNewMatch) return;

    const timeoutId = setTimeout(async () => {
      const newRadius = currentRadius * 2;
      try {
        await apiPatch(`/api/matchmaking/requests/${activeRequestId}/`, {
          radius_km: newRadius,
        });

        setCurrentRadius(newRadius);
        console.log(`Rayon étendu automatiquement à ${newRadius} km`);
      } catch (error) {
        console.error("Erreur lors de l'extension du rayon", error);
      }
    }, 5 * 60 * 1000);

    return () => clearTimeout(timeoutId);
  }, [activeRequestId, currentRadius, hasNewMatch]);

  async function handleMatchmaking(isPendingAction = false) {
    if (!isAuthenticated && !isPendingAction) {
      setPendingAction(() => () => handleMatchmaking(true));
      setAuthModalOpen(true);
      return;
    }

    const currentDjangoId = await ensureDjangoId();
    if (!currentDjangoId) return;

    setIsMatching(true);

    try {
      const { latitude, longitude } = await getUserLocation();

      const defaultExpiresAt = new Date();
      defaultExpiresAt.setHours(defaultExpiresAt.getHours() + 1);

      let reqId = null;
      let startedDate = new Date();
      let expirationDate = defaultExpiresAt;
      let radius = 20;

      try {
        const res = await apiPost('/api/matchmaking/requests/', {
          game: currentDjangoId,
          latitude,
          longitude,
          radius_km: radius,
          expires_at: defaultExpiresAt.toISOString(),
        });
        reqId = res.id;
        startedDate = new Date(res.created_at);
        expirationDate = new Date(res.expires_at);
      } catch {
        const activeReqs = await apiGet(`/api/matchmaking/requests/?game=${currentDjangoId}`);
        if (activeReqs && activeReqs.length > 0) {
          reqId = activeReqs[0].id;
          radius = activeReqs[0].radius_km;
          startedDate = new Date(activeReqs[0].created_at);
          expirationDate = new Date(activeReqs[0].expires_at);
        }
      }

      setActiveRequestId(reqId);
      setCurrentRadius(radius);
      setActiveRequestStartedAt(startedDate);
      setActiveRequestUntil(expirationDate);

      const matchesData = await apiGet('/api/matchmaking/matches/');
      setMatches(matchesData);
      setHasNewMatch(false);
      setIsMatchmakingModalOpen(true);

    } catch (error) {
      console.error("Erreur API lors du matchmaking", error);
      alert("Un problème est survenu lors de la recherche de joueurs.");
    } finally {
      setIsMatching(false);
    }
  }

  async function getUserLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve) => {
      const fallbackToIP = async () => {
        try {
          const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
          const data = await res.json();
          resolve({ latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) });
        } catch {
          resolve({ latitude: 48.8566, longitude: 2.3522 });
        }
      };

      if (!navigator.geolocation) {
        fallbackToIP();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (_err) => {
          console.warn('Géolocalisation refusée ou en erreur, utilisation de l\'IP...');
          fallbackToIP();
        }
      );
    });
  }

  async function ensureDjangoId(): Promise<string | null> {
    if (djangoId) return djangoId;
    if (igdbId && game) {
      try {
        const res = await importIgdbGameToDjango(
          Number(igdbId),
          game.name,
          game.cover_url || game.image || null,
          game.iso_release_date || null
        );
        setDjangoId(String(res.id));
        return String(res.id);
      } catch (err) {
        console.error('Erreur lors de l’importation IGDB', err);
        return null;
      }
    }
    return null;
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
    if (!currentDjangoId) return;
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
    if (!currentDjangoId) return;

    const nextIsFavorite = !userGame?.is_favorite;

    try {
      if (userGame) {
        const updated = await apiPatch(`/api/me/games/${currentDjangoId}/`, {
          is_favorite: nextIsFavorite,
        });
        setUserGame({
          ...userGame,
          is_favorite: updated.is_favorite,
        });
      } else {
        const created = await apiPost('/api/me/games/', {
          game_id: currentDjangoId,
          status: 'ENVIE_DE_JOUER',
          is_favorite: true,
        });
        setUserGame(created);
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour du coup de cœur');
    }
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
                backgroundImage: `linear-gradient(to right, black 20%, transparent 30%, transparent 70%, black 80%),url(${game.image})`,
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
                  src={game.image}
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
                {/* Statut + Coup de cœur */}
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
            {/* Colonne droite : infos */}
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
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.platforms && game.platforms.length > 0
                  ? game.platforms
                    .map((p: any) => p.name || p.nom_plateforme)
                    .join(', ')
                  : 'Non renseigné'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <DescriptionIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Description
                </Typography>
              </Box>
              <Typography
                variant="body1"
                sx={{
                  mb: 3,
                  color: translating ? 'text.secondary' : 'text.primary',
                }}
              >
                {translating
                  ? 'Traduction en cours…'
                  : (translatedDescription ??
                    game.summary ??
                    'Aucune description disponible.')}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <CategoryIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Genres
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.genres && game.genres.length > 0
                  ? game.genres
                    .map((g: any) => g.nom_genre || g.name)
                    .join(', ')
                  : 'Non renseigné'}
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}
              >
                <CalendarTodayIcon color="action" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Date de sortie
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {game.display_release_date || 'Non renseignée'}
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
              onClick={() => handleMatchmaking()}
              disabled={isMatching}
            >
              {isMatching ? 'Recherche en cours...' : 'Matchmaking'}
            </SecondaryButton>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleSetStatus('ENVIE_DE_JOUER')}
            >
              Ajouter à la collection
            </Button>
          </Box>
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
              gameId={djangoId ?? ''}
              userReview={userReview}
              currentUserId={currentUserId}
              onReviewChange={review => setUserReview(review)}
            />
          </Box>
        </Paper>
      </Box>
      {!isMatchmakingModalOpen && (
        <FloatingMatchmakingWidget
          startedAt={activeRequestStartedAt}
          hasNewMatch={hasNewMatch}
          onClick={() => {
            setIsMatchmakingModalOpen(true);
            setHasNewMatch(false);
          }}
        />
      )}
      <MatchmakingModal
        open={isMatchmakingModalOpen}
        onClose={() => setIsMatchmakingModalOpen(false)}
        matches={matches}
        startedAt={activeRequestStartedAt}
      />
    </Box>
  );
}
