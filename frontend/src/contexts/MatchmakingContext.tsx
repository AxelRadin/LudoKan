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
import i18n from '../i18n';
import { apiDelete, apiGet, apiPatch, apiPost } from '../services/api';
import { joinOrCreateParty } from '../services/party';
import { useAuth } from './useAuth';
import { useActiveParty } from '../hooks/useActiveParty';

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

  const {
    party,
    refresh: refreshParty,
    leave: leaveParty,
    markReady,
    markReadyForChat,
    markStartEarly,
  } = useActiveParty();

  const [isMatching, setIsMatching] = useState(false);
  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);

  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [activeRequestStartedAt, setActiveRequestStartedAt] =
    useState<Date | null>(null);
  const [currentRadius, setCurrentRadius] = useState<number>(20);
  const [hasNewMatch, setHasNewMatch] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const [activeGame, setActiveGame] = useState<{
    id: string;
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
        .then(async res => {
          const reqs = Array.isArray(res) ? res : res?.results;

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
              setActiveGame({
                id: active.game,
                name: gameData.name_fr || gameData.name,
                image,
              });
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
          const res = await apiGet(`/api/matchmaking/requests/?game=${gameId}`);
          const activeReqs = Array.isArray(res) ? res : res?.results;

          if (activeReqs && activeReqs.length > 0) {
            reqId = activeReqs[0].id;
            radius = activeReqs[0].radius_km;
            startedDate = new Date(activeReqs[0].created_at);
          }
        }

        setActiveRequestId(reqId);
        setCurrentRadius(radius);
        setActiveRequestStartedAt(startedDate);
        setActiveGame({ id: gameId, name: gameName, image: gameImage });

        const matchesData = await apiGet('/api/matchmaking/matches/');
        setMatches(matchesData);
        setHasNewMatch(false);
        setIsMatchmakingModalOpen(true);
      } catch (error) {
        console.error('Erreur API lors du matchmaking', error);
        alert(i18n.t('matchmakingContext.errorAlert'));
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
        console.error("Erreur lors de l'annulation", error);
      }
    }
    if (party) {
      await leaveParty();
    }
    setActiveRequestId(null);
    setActiveRequestStartedAt(null);
    setActiveGame(null);
    setMatches([]);
    setHasNewMatch(false);
    setIsMatchmakingModalOpen(false);
  }, [activeRequestId, party, leaveParty]);

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

  useEffect(() => {
    if (!activeRequestId || party) return;

    const intervalId = setInterval(async () => {
      const now = new Date();
      const startTime = activeRequestStartedAt || now;
      const diffSeconds = (now.getTime() - startTime.getTime()) / 1000;

      const newRadius = diffSeconds >= 300 ? 20000 : currentRadius + 50;

      if (newRadius !== currentRadius) {
        try {
          setIsExpanding(true);
          await apiPatch(`/api/matchmaking/requests/${activeRequestId}/`, {
            radius_km: newRadius,
          });
          setCurrentRadius(newRadius);

          setTimeout(() => setIsExpanding(false), 3000);
        } catch (error) {
          console.error("Erreur d'extension du rayon", error);
        }
      }

      if (newRadius >= 20000) clearInterval(intervalId);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [activeRequestId, party, activeRequestStartedAt, currentRadius]);

  useEffect(() => {
    if (!activeRequestId || hasNewMatch || party) return;

    const expansionInterval = setInterval(async () => {
      const now = new Date();
      const startTime = activeRequestStartedAt || now;
      const diffSeconds = (now.getTime() - startTime.getTime()) / 1000;

      let newRadius = currentRadius;

      if (diffSeconds >= 300) {
        newRadius = 20000;
      } else {
        newRadius = currentRadius + 50;
      }

      if (newRadius !== currentRadius) {
        try {
          setIsExpanding(true);
          await apiPatch(`/api/matchmaking/requests/${activeRequestId}/`, {
            radius_km: newRadius,
          });
          setCurrentRadius(newRadius);

          setTimeout(() => setIsExpanding(false), 3000);
        } catch (error) {
          console.error("Erreur d'extension du rayon", error);
        }
      }

      if (newRadius >= 20000) clearInterval(expansionInterval);
    }, 30000);

    return () => clearInterval(expansionInterval);
  }, [
    activeRequestId,
    currentRadius,
    hasNewMatch,
    party,
    activeRequestStartedAt,
  ]);

  useEffect(() => {
    if (activeRequestId && matches.length > 0 && !party && activeGame?.id) {
      const transitionToParty = async () => {
        try {
          await joinOrCreateParty(Number(activeGame.id));
          setMatches([]);
          refreshParty();
        } catch (error) {
          console.error('Erreur lors du transfert vers le lobby', error);
        }
      };
      transitionToParty();
    }
  }, [matches.length, activeRequestId, party, activeGame, refreshParty]);

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

      {(activeRequestStartedAt || party) &&
        !isMatchmakingModalOpen &&
        isAuthenticated && (
          <FloatingMatchmakingWidget
            startedAt={activeRequestStartedAt}
            hasNewMatch={hasNewMatch}
            party={party}
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
        startedAt={activeRequestStartedAt}
        game={activeGame}
        party={party}
        isExpanding={isExpanding}
        currentRadius={currentRadius}
        partyActions={{
          markReady,
          markReadyForChat,
          markStartEarly,
          leave: leaveParty,
        }}
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
