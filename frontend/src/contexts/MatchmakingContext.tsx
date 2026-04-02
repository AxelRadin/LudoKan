import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import ConfirmCancelMatchmakingModal from '../components/ConfirmCancelMatchmakingModal';
import FloatingMatchmakingWidget from '../components/FloatingMatchmakingWidget';
import MatchmakingModal from '../components/MatchmakingModal';
import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';
import { useAuth } from './useAuth';

interface MatchmakingContextType {
  startMatchmaking: (
    gameId: string,
    gameName: string,
    gameImage: string
  ) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  isMatching: boolean;
}

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(
  undefined
);

// eslint-disable-next-line react-refresh/only-export-components
export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (!context) {
    throw new Error('useMatchmaking must be used within a MatchmakingProvider');
  }
  return context;
}

interface MatchmakingProviderProps {
  readonly children: React.ReactNode;
}

/** Approximate coordinates for matchmaking radius (IP-based; avoids sensitive Geolocation API). */
async function getUserLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  try {
    const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
    const data = await res.json();
    return {
      latitude: Number.parseFloat(data.latitude),
      longitude: Number.parseFloat(data.longitude),
    };
  } catch {
    return { latitude: 48.8566, longitude: 2.3522 };
  }
}

export function MatchmakingProvider({ children }: MatchmakingProviderProps) {
  const { isAuthenticated } = useAuth();

  const [isMatching, setIsMatching] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [activeRequestStartedAt, setActiveRequestStartedAt] =
    useState<Date | null>(null);
  const [currentRadius, setCurrentRadius] = useState<number>(20);
  const [hasNewMatch, setHasNewMatch] = useState(false);

  const [activeGame, setActiveGame] = useState<{
    name: string;
    image: string;
  } | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingGame, setPendingGame] = useState<{
    id: string;
    name: string;
    image: string;
  } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      apiGet('/api/matchmaking/requests/')
        .then(async reqs => {
          if (reqs?.length > 0) {
            const active = reqs[0];
            setActiveRequestId(active.id);
            setActiveRequestStartedAt(new Date(active.created_at));
            setCurrentRadius(active.radius_km);

            try {
              const gameData = await apiGet(`/api/games/${active.game}/`);
              let image = gameData.cover_url;

              if (image?.includes('t_thumb')) {
                image = image.replace('t_thumb', 't_1080p');
              } else if (image?.includes('t_cover_big')) {
                image = image.replace('t_cover_big', 't_1080p');
              }
              setActiveGame({ name: gameData.name_fr || gameData.name, image });
            } catch (e) {
              console.error(e);
            }

            try {
              const currentMatches = await apiGet('/api/matchmaking/matches/');
              setMatches(currentMatches);
            } catch (e) {
              console.error(e);
            }
          }
        })
        .catch(() => {});
    } else {
      setActiveRequestId(null);
      setActiveRequestStartedAt(null);
      setMatches([]);
    }
  }, [isAuthenticated]);

  const executeMatchmaking = useCallback(
    async (gameId: string, gameName: string, gameImage: string) => {
      setIsMatching(true);
      try {
        const { latitude, longitude } = await getUserLocation();
        const defaultExpiresAt = new Date();
        defaultExpiresAt.setHours(defaultExpiresAt.getHours() + 1);

        let reqId = null;
        let startedDate = new Date();
        let radius = 20;

        try {
          const res = await apiPost('/api/matchmaking/requests/', {
            game: gameId,
            latitude,
            longitude,
            radius_km: radius,
            expires_at: defaultExpiresAt.toISOString(),
          });
          reqId = res.id;
          startedDate = new Date(res.created_at);
        } catch {
          const activeReqs = await apiGet(
            `/api/matchmaking/requests/?game=${gameId}`
          );
          if (activeReqs?.length > 0) {
            reqId = activeReqs[0].id;
            radius = activeReqs[0].radius_km;
            startedDate = new Date(activeReqs[0].created_at);
          }
        }

        setActiveRequestId(reqId);
        setCurrentRadius(radius);
        setActiveRequestStartedAt(startedDate);
        setActiveGame({ name: gameName, image: gameImage });

        const matchesData = await apiGet('/api/matchmaking/matches/');
        setMatches(matchesData);
        setHasNewMatch(false);
        setIsMatchmakingModalOpen(true);
      } catch (error) {
        console.error('Erreur API lors du matchmaking', error);
        alert('Un problème est survenu lors de la recherche de joueurs.');
      } finally {
        setIsMatching(false);
      }
    },
    []
  );

  const startMatchmaking = useCallback(
    async (gameId: string, gameName: string, gameImage: string) => {
      if (activeRequestId) {
        setPendingGame({ id: gameId, name: gameName, image: gameImage });
        setIsMatchmakingModalOpen(true);
        setIsConfirmModalOpen(true);
        return;
      }

      await executeMatchmaking(gameId, gameName, gameImage);
    },
    [activeRequestId, executeMatchmaking]
  );

  const cancelMatchmaking = useCallback(async () => {
    if (activeRequestId) {
      try {
        await apiDelete(`/api/matchmaking/requests/${activeRequestId}/`);
      } catch (error) {
        console.error("Erreur lors de l'annulation côté serveur", error);
      }
    }

    setActiveRequestId(null);
    setActiveRequestStartedAt(null);
    setActiveGame(null);
    setMatches([]);
    setHasNewMatch(false);
    setIsMatchmakingModalOpen(false);
  }, [activeRequestId]);

  const confirmNewMatchmaking = useCallback(async () => {
    if (pendingGame) {
      await cancelMatchmaking();
      setIsConfirmModalOpen(false);
      await executeMatchmaking(
        pendingGame.id,
        pendingGame.name,
        pendingGame.image
      );
      setPendingGame(null);
    }
  }, [pendingGame, cancelMatchmaking, executeMatchmaking]);

  // Nouveau useEffect de polling avec cache buster et protection d'état
  useEffect(() => {
    if (!activeRequestId) return;

    const intervalId = setInterval(async () => {
      try {
        // Ajout du paramètre _t pour empêcher la mise en cache par le navigateur
        const currentMatches = await apiGet(
          `/api/matchmaking/matches/?_t=${Date.now()}`
        );

        if (Array.isArray(currentMatches)) {
          setMatches(prevMatches => {
            // Comparaison sûre avec l'état précédent
            if (currentMatches.length > prevMatches.length) {
              setHasNewMatch(true);
            }
            return currentMatches;
          });
        }
      } catch {
        // En cas d'erreur (ex: requête expirée en base), on réinitialise
        setActiveRequestId(null);
        setActiveRequestStartedAt(null);
      }
    }, 5000); // 5000ms = 5 secondes

    return () => clearInterval(intervalId);
  }, [activeRequestId]);

  useEffect(() => {
    if (!activeRequestId || hasNewMatch) return;

    const timeoutId = setTimeout(
      async () => {
        const newRadius = currentRadius * 2;
        try {
          await apiPatch(`/api/matchmaking/requests/${activeRequestId}/`, {
            radius_km: newRadius,
          });
          setCurrentRadius(newRadius);
        } catch (error) {
          console.error("Erreur d'extension du rayon", error);
        }
      },
      5 * 60 * 1000
    );

    return () => clearTimeout(timeoutId);
  }, [activeRequestId, currentRadius, hasNewMatch]);

  const contextValue = useMemo(
    () => ({
      startMatchmaking,
      cancelMatchmaking,
      isMatching,
    }),
    [startMatchmaking, cancelMatchmaking, isMatching]
  );

  return (
    <MatchmakingContext.Provider value={contextValue}>
      {children}

      {activeRequestStartedAt && !isMatchmakingModalOpen && isAuthenticated && (
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
        onCancel={cancelMatchmaking}
        matches={matches}
        startedAt={activeRequestStartedAt}
        game={activeGame}
      />
      <ConfirmCancelMatchmakingModal
        open={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setPendingGame(null);
        }}
        onConfirm={confirmNewMatchmaking}
      />
    </MatchmakingContext.Provider>
  );
}
