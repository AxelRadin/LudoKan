import { useCallback, useEffect, useState } from 'react';
import {
  Party,
  getMyActiveParty,
  leaveParty,
  markPartyReady,
  markPartyReadyForChat,
  markPartyStartEarly,
} from '../services/party';

export function useActiveParty() {
  const [party, setParty] = useState<Party | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isMarkingReady, setIsMarkingReady] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const activeParty = await getMyActiveParty();
      setParty(activeParty);
      setError(null);
    } catch (err: any) {
      if (err.message?.includes('404')) {
        setParty(null);
      } else {
        setError('Erreur lors de la récupération du lobby.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const interval = setInterval(() => {
      if (document.hasFocus()) {
        setParty(currentParty => {
          if (
            currentParty &&
            [
              'open',
              'waiting_ready',
              'waiting_ready_for_chat',
              'countdown',
            ].includes(currentParty.status)
          ) {
            refresh();
          }
          return currentParty;
        });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [refresh]);

  const markReady = async (accepted: boolean = true) => {
    if (!party) return;
    setIsMarkingReady(true);
    try {
      await markPartyReady(party.id, accepted);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarkingReady(false);
    }
  };

  const markReadyForChat = async (accepted: boolean = true) => {
    if (!party) return;
    setIsMarkingReady(true);
    try {
      await markPartyReadyForChat(party.id, accepted);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarkingReady(false);
    }
  };

  const leave = async () => {
    if (!party) return;
    setIsLeaving(true);
    try {
      await leaveParty(party.id);
      setParty(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLeaving(false);
    }
  };

  const markStartEarly = async (accepted: boolean = true) => {
    if (!party) return;
    setIsMarkingReady(true);
    try {
      await markPartyStartEarly(party.id, accepted);
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsMarkingReady(false);
    }
  };

  return {
    party,
    isLoading,
    error,
    isMarkingReady,
    isLeaving,
    refresh,
    markReady,
    markReadyForChat,
    leave,
    markStartEarly,
  };
}
