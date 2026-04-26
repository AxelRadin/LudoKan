import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  fetchIgdbGameById,
  resolveGameIdIfNeeded,
  translateDescription,
} from '../api/igdb';
import { useMatchmaking } from '../contexts/MatchmakingContext';
import { useAuth } from '../contexts/useAuth';
import type { Review } from '../components/reviews/ReviewSection';
import { hi } from '../pages/gamePageUtils';
import { apiGet, apiPatch, apiPost } from '../services/api';
import type { NormalizedGame, UserLibraryData } from '../types/game';

export type GamePageLogic = Readonly<{
  game: NormalizedGame | null;
  gameNotFound: boolean;
  djangoId: number | null;
  userGame: UserLibraryData | null;
  userReview: Review | null;
  setUserReview: Dispatch<SetStateAction<Review | null>>;
  currentUserId: number | null;
  translatedDesc: string | null;
  translating: boolean;
  descExpanded: boolean;
  setDescExpanded: Dispatch<SetStateAction<boolean>>;
  selectedShot: string | null;
  setSelectedShot: Dispatch<SetStateAction<string | null>>;
  isMatching: boolean;
  ensureDjangoId: () => Promise<number | null>;
  refreshUserLibrary: () => Promise<void>;
  handleSetStatus: (
    s: 'EN_COURS' | 'TERMINE' | 'ENVIE_DE_JOUER',
    p?: boolean
  ) => Promise<void>;
  handleToggleFavorite: (p?: boolean) => Promise<void>;
  handleSetMatchmaking: (p?: boolean) => Promise<void>;
}>;

export function useGamePageLogic(): GamePageLogic {
  const { id, igdbId } = useParams();
  const { isAuthenticated, setAuthModalOpen, setPendingAction } = useAuth();
  const { startMatchmaking, isMatching } = useMatchmaking();

  const [game, setGame] = useState<NormalizedGame | null>(null);
  const [gameNotFound, setGameNotFound] = useState(false);
  const [djangoId, setDjangoId] = useState<number | null>(null);
  const [userGame, setUserGame] = useState<UserLibraryData | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);
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
        // Filtrer par utilisateur : la liste paginée ?game= seule peut ne pas
        // contenir l'avis courant (ex. avis ancien sur une page suivante).
        const d: unknown = await apiGet(
          `/api/reviews/?game=${djangoId}&user=${m.id}`
        );
        const l = Array.isArray(d)
          ? d
          : ((d as { results?: Review[] }).results ?? []);
        setUserReview((l[0] as Review | undefined) ?? null);
      } catch {
        setCurrentUserId(null);
        setUserReview(null);
      }
    })();
  }, [djangoId, isAuthenticated]);

  async function refreshUserLibrary() {
    if (!djangoId) return;
    try {
      const d: NormalizedGame = await apiGet(`/api/games/${djangoId}/`);
      setUserGame(d.user_library ?? null);
    } catch {
      /* ignore */
    }
  }

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
        const u = (await apiPatch(`/api/me/games/${did}/`, {
          status: s,
        })) as UserLibraryData & { status: string };
        setUserGame({
          ...userGame,
          status: u.status,
          id: u.id ?? userGame.id,
          collection_ids: u.collection_ids ?? userGame.collection_ids,
          is_favorite: u.is_favorite ?? userGame.is_favorite,
        });
      } else {
        const c = (await apiPost('/api/me/games/', {
          game_id: did,
          status: s,
        })) as UserLibraryData & { id?: number; collection_ids?: number[] };
        setUserGame({
          status: c.status,
          is_favorite: Boolean(c.is_favorite),
          playtime_forever: c.playtime_forever,
          id: c.id,
          collection_ids: c.collection_ids,
        });
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
      const u = (await apiPatch(`/api/me/games/${did}/`, {
        is_favorite: !userGame?.is_favorite,
      })) as UserLibraryData & { id?: number; collection_ids?: number[] };
      setUserGame(prev => {
        const base: UserLibraryData = prev ?? {
          status: u.status ?? 'EN_COURS',
          is_favorite: false,
        };
        return {
          ...base,
          status: u.status ?? base.status,
          is_favorite: Boolean(u.is_favorite),
          id: u.id ?? base.id,
          collection_ids: u.collection_ids ?? base.collection_ids,
          playtime_forever: u.playtime_forever ?? base.playtime_forever,
        };
      });
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
    setUserReview,
    currentUserId,
    translatedDesc,
    translating,
    descExpanded,
    setDescExpanded,
    selectedShot,
    setSelectedShot,
    ensureDjangoId,
    refreshUserLibrary,
    handleSetStatus,
    handleToggleFavorite,
    handleSetMatchmaking,
    isMatching,
  };
}
