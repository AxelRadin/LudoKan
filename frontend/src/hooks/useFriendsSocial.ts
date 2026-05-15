import { useCallback, useEffect, useState } from 'react';
import {
  fetchFriendRequests,
  fetchFriends,
  type FriendRequestRow,
  type FriendRow,
} from '../api/social';

/**
 * Données amis + demandes pour l’utilisateur connecté (identifié par `userId`).
 */
export function useFriendsSocial(userId: number | undefined) {
  const [friendsList, setFriendsList] = useState<FriendRow[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestRow[]>(
    []
  );
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestRow[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setFriendsList([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [f, inc, out] = await Promise.all([
        fetchFriends(),
        fetchFriendRequests('incoming'),
        fetchFriendRequests('outgoing'),
      ]);
      setFriendsList(f);
      setIncomingRequests(inc);
      setOutgoingRequests(out);
    } catch {
      setFriendsList([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return {
    friendsList,
    incomingRequests,
    outgoingRequests,
    loading,
    refresh,
  };
}
