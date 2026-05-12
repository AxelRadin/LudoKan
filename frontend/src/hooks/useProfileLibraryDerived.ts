import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import type { GameListItem } from '../components/GameList';
import type { UserGame } from '../api/userGames';
import type {
  LibraryCollectionFilter,
  LibraryCounts,
  LibraryStatusFilter,
} from '../constants/libraryFilter';

/** Carte UserGame → ligne liste (réutilisé profil public / commun / filtres). */
export function userGameToGameListItem(g: UserGame): GameListItem {
  return {
    id: g.game.id,
    name: g.game.name,
    cover_url: g.game.cover_url,
    image: g.game.image,
    status: g.status,
    userGameId: g.id,
    steam_appid: g.game.steam_appid,
    playtime_forever: g.playtime_forever,
  };
}

export function filterUserGamesForCollection(
  userGames: UserGame[],
  collectionFilterId: LibraryCollectionFilter
): UserGame[] {
  if (collectionFilterId === 'ALL') return userGames;
  return userGames.filter(ug =>
    Array.isArray(ug.collection_ids)
      ? ug.collection_ids.includes(collectionFilterId)
      : false
  );
}

export function gamesForStatus(
  games: UserGame[],
  status: string
): GameListItem[] {
  return games.filter(g => g.status === status).map(userGameToGameListItem);
}

export function favoritesToGameListItems(
  userGamesForLibrary: UserGame[]
): GameListItem[] {
  return userGamesForLibrary
    .filter(g => g.is_favorite)
    .map(userGameToGameListItem);
}

export type ProfileLibraryDerived = {
  userGamesForLibrary: UserGame[];
  gamesEnCours: GameListItem[];
  gamesTermines: GameListItem[];
  gamesEnvie: GameListItem[];
  gamesFavoris: GameListItem[];
  libraryCounts: LibraryCounts;
  gamesForLibraryFilter: GameListItem[];
  singleFilterTitle: string;
  libraryBadgeText: string;
};

/**
 * Dérivés bibliothèque partagés entre la page profil connecté et le profil public.
 */
export function useProfileLibraryDerived(
  userGames: UserGame[],
  collectionFilterId: LibraryCollectionFilter,
  libraryFilter: LibraryStatusFilter,
  t: TFunction
): ProfileLibraryDerived {
  const userGamesForLibrary = useMemo(
    () => filterUserGamesForCollection(userGames, collectionFilterId),
    [userGames, collectionFilterId]
  );

  const gamesEnCours = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'EN_COURS'),
    [userGamesForLibrary]
  );
  const gamesTermines = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'TERMINE'),
    [userGamesForLibrary]
  );
  const gamesEnvie = useMemo(
    () => gamesForStatus(userGamesForLibrary, 'ENVIE_DE_JOUER'),
    [userGamesForLibrary]
  );
  const gamesFavoris = useMemo(
    () => favoritesToGameListItems(userGamesForLibrary),
    [userGamesForLibrary]
  );

  const libraryCounts: LibraryCounts = useMemo(
    () => ({
      all: userGamesForLibrary.length,
      enCours: gamesEnCours.length,
      termines: gamesTermines.length,
      envie: gamesEnvie.length,
    }),
    [
      userGamesForLibrary.length,
      gamesEnCours.length,
      gamesTermines.length,
      gamesEnvie.length,
    ]
  );

  const gamesForLibraryFilter = useMemo((): GameListItem[] => {
    switch (libraryFilter) {
      case 'EN_COURS':
        return gamesEnCours;
      case 'TERMINE':
        return gamesTermines;
      case 'ENVIE_DE_JOUER':
        return gamesEnvie;
      default:
        return [];
    }
  }, [libraryFilter, gamesEnCours, gamesTermines, gamesEnvie]);

  const singleFilterTitle = useMemo(() => {
    const map: Record<Exclude<LibraryStatusFilter, 'ALL'>, string> = {
      EN_COURS: t('profilePage.statusPlaying'),
      TERMINE: t('profilePage.statusDone'),
      ENVIE_DE_JOUER: t('profilePage.statusWishlist'),
    };
    if (libraryFilter === 'ALL') return '';
    return map[libraryFilter];
  }, [libraryFilter, t]);

  const libraryBadgeText = useMemo(() => {
    if (collectionFilterId === 'ALL') {
      return userGames.length <= 1
        ? t('profilePage.libraryTotal', { count: userGames.length })
        : t('profilePage.libraryTotalPlural', { count: userGames.length });
    }
    return userGamesForLibrary.length <= 1
      ? t('profilePage.libraryInViewOne', { count: userGamesForLibrary.length })
      : t('profilePage.libraryInViewMany', {
          count: userGamesForLibrary.length,
        });
  }, [collectionFilterId, userGames.length, userGamesForLibrary.length, t]);

  return {
    userGamesForLibrary,
    gamesEnCours,
    gamesTermines,
    gamesEnvie,
    gamesFavoris,
    libraryCounts,
    gamesForLibraryFilter,
    singleFilterTitle,
    libraryBadgeText,
  };
}
