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
import MatchmakingModal, { PartyInfo } from '../components/MatchmakingModal';
import PartyChatModal from '../components/PartyChatModal'; // <-- Import de la nouvelle modale
import { apiDelete, apiGet, apiPost } from '../services/api';
import { useAuth } from './useAuth';

interface MatchmakingContextType {
  startMatchmaking: (
    gameId: string,
    gameName: string,
    gameImage: string
  ) => Promise<void>;
  cancelMatchmaking: () => Promise<void>;
  handleReady: () => Promise<void>;
  handleReadyForChat: () => Promise<void>;
  isMatching: boolean;
  activeParty: PartyInfo | null;
}

const MatchmakingContext = createContext<MatchmakingContextType | undefined>(
  undefined
);

// eslint-disable-next-line react-refresh/only-export-components
export function useMatchmaking() {
  const context = useContext(MatchmakingContext);
  if (!context)
    throw new Error('useMatchmaking must be used within a MatchmakingProvider');
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

  const [isMatching, setIsMatching] = useState(false);

  const [isMatchmakingModalOpen, setIsMatchmakingModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);

  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [activeRequestStartedAt, setActiveRequestStartedAt] =
    useState<Date | null>(null);
  const [activeParty, setActiveParty] = useState<PartyInfo | null>(null);

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

  const clearAllStates = useCallback(() => {
    setActiveRequestId(null);
    setActiveRequestStartedAt(null);
    setActiveParty(null);
    setActiveGame(null);
    setIsMatchmakingModalOpen(false);
    setIsChatModalOpen(false);
  }, []);

  const activePartyStatus = activeParty?.status;
  const hasActiveParty = !!activeParty;

  useEffect(() => {
    if (!isAuthenticated) {
      clearAllStates();
      return;
    }

    const checkStatus = async () => {
      try {
        const partyRes = await apiGet(
          `/api/matchmaking/parties/my-active/?_t=${Date.now()}`
        );

        if (partyRes && partyRes.id) {
          const isMatchFound =
            partyRes.members.length > 1 || partyRes.status !== 'open';

          if (isMatchFound) {
            if (
              partyRes.status === 'chat_active' &&
              activePartyStatus !== 'chat_active'
            ) {
              setIsMatchmakingModalOpen(false);
              setIsChatModalOpen(true);
            }
            setActiveParty(partyRes);
          } else {
            setActiveParty(null);
          }
          return;
        }

        if (activeRequestId) {
          const reqsRes = await apiGet(
            `/api/matchmaking/requests/?_t=${Date.now()}`
          );
          const reqsList = Array.isArray(reqsRes)
            ? reqsRes
            : reqsRes?.results || [];
          const stillActive = reqsList.find(
            (r: any) => r.id === activeRequestId
          );
          if (!stillActive) {
            setActiveRequestId(null);
            setActiveRequestStartedAt(null);
          }
        }
      } catch (error) {
        console.error('Erreur lors du polling de statut', error);
      }
    };

    checkStatus();

    let intervalId: NodeJS.Timeout | undefined;

    if (activeRequestId || hasActiveParty) {
      intervalId = setInterval(checkStatus, 4000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    isAuthenticated,
    activeRequestId,
    activePartyStatus,
    hasActiveParty,
    clearAllStates,
  ]);

  const executeMatchmaking = useCallback(
    async (gameId: string, gameName: string, gameImage: string) => {
      setIsMatching(true);
      try {
        const { latitude, longitude } = await getUserLocation();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        const res = await apiPost('/api/matchmaking/requests/', {
          game: gameId,
          latitude,
          longitude,
          radius_km: 20,
          expires_at: expiresAt.toISOString(),
        });

        setActiveRequestId(res.id);
        setActiveRequestStartedAt(new Date(res.created_at));
        setActiveGame({ name: gameName, image: gameImage });
        setIsMatchmakingModalOpen(true);
      } catch (error) {
        console.error('Erreur lancement matchmaking', error);
      } finally {
        setIsMatching(false);
      }
    },
    []
  );

  const startMatchmaking = useCallback(
    async (gameId: string, gameName: string, gameImage: string) => {
      if (activeRequestId || activeParty) {
        setPendingGame({ id: gameId, name: gameName, image: gameImage });
        setIsConfirmModalOpen(true);
        return;
      }
      await executeMatchmaking(gameId, gameName, gameImage);
    },
    [activeRequestId, activeParty, executeMatchmaking]
  );

  const cancelMatchmaking = useCallback(async () => {
    try {
      if (activeParty) {
        await apiPost(`/api/matchmaking/parties/${activeParty.id}/leave/`);
      } else if (activeRequestId) {
        await apiDelete(`/api/matchmaking/requests/${activeRequestId}/`);
      }
    } catch (error) {
      console.error("Erreur lors de l'annulation", error);
    } finally {
      clearAllStates();
    }
  }, [activeRequestId, activeParty, clearAllStates]);

  const handleReady = useCallback(async () => {
    if (!activeParty) return;
    try {
      await apiPost(`/api/matchmaking/parties/${activeParty.id}/ready/`);
    } catch (e) {
      console.error(e);
    }
  }, [activeParty]);

  const handleReadyForChat = useCallback(async () => {
    if (!activeParty) return;
    try {
      await apiPost(
        `/api/matchmaking/parties/${activeParty.id}/ready-for-chat/`
      );
    } catch (e) {
      console.error(e);
    }
  }, [activeParty]);

  const contextValue = useMemo(
    () => ({
      startMatchmaking,
      cancelMatchmaking,
      handleReady,
      handleReadyForChat,
      isMatching,
      activeParty,
    }),
    [
      startMatchmaking,
      cancelMatchmaking,
      handleReady,
      handleReadyForChat,
      isMatching,
      activeParty,
    ]
  );

  const widgetStatus =
    activeParty?.status === 'chat_active'
      ? 'chat'
      : activeParty
        ? 'lobby'
        : 'searching';

  return (
    <MatchmakingContext.Provider value={contextValue}>
      {children}

      {(activeRequestStartedAt || activeParty) &&
        !isMatchmakingModalOpen &&
        !isChatModalOpen &&
        isAuthenticated && (
          <FloatingMatchmakingWidget
            startedAt={activeRequestStartedAt || new Date()}
            status={widgetStatus}
            onClick={() => {
              if (widgetStatus === 'chat') setIsChatModalOpen(true);
              else setIsMatchmakingModalOpen(true);
            }}
          />
        )}

      <MatchmakingModal
        open={isMatchmakingModalOpen}
        onClose={() => setIsMatchmakingModalOpen(false)}
        onCancel={cancelMatchmaking}
        party={activeParty}
        startedAt={activeRequestStartedAt}
        game={activeGame}
        onReady={handleReady}
        onReadyForChat={handleReadyForChat}
      />

      <PartyChatModal
        open={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onLeave={cancelMatchmaking}
        party={activeParty}
        game={activeGame}
      />

      <ConfirmCancelMatchmakingModal
        open={isConfirmModalOpen}
        onClose={() => {
          setIsConfirmModalOpen(false);
          setPendingGame(null);
        }}
        onConfirm={async () => {
          await cancelMatchmaking();
          setIsConfirmModalOpen(false);
          if (pendingGame)
            await executeMatchmaking(
              pendingGame.id,
              pendingGame.name,
              pendingGame.image
            );
          setPendingGame(null);
        }}
      />
    </MatchmakingContext.Provider>
  );
}
