import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo } from 'react';
import type { SetURLSearchParams } from 'react-router-dom';
import {
  removeGameFromCollection,
  type UserCollection,
} from '../api/collections';
import type { UserGame } from '../api/userGames';
import {
  LIBRARY_COLLECTION_QUERY_KEY,
  LIBRARY_STATUS_QUERY_KEY,
  type LibraryCollectionFilter,
  type LibraryStatusFilter,
  parseLibraryCollectionParam,
  parseLibraryStatusParam,
} from '../constants/libraryFilter';
import { useProfileLibraryDerived } from './useProfileLibraryDerived';

export type UseProfileLibraryFiltersArgs = Readonly<{
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  userGames: UserGame[];
  collections: UserCollection[];
  collectionsLoading: boolean;
  reloadUserGames: () => Promise<void>;
  refreshCollections: () => Promise<void>;
  t: TFunction;
}>;

function useResetInvalidLibraryCollectionFilter(
  collections: UserCollection[],
  collectionFilterId: LibraryCollectionFilter,
  collectionsLoading: boolean,
  setLibraryCollectionFilter: (next: LibraryCollectionFilter) => void
) {
  useEffect(() => {
    if (collectionsLoading) return;
    if (collectionFilterId === 'ALL') return;
    const exists = collections.some(c => c.id === collectionFilterId);
    if (!exists) setLibraryCollectionFilter('ALL');
  }, [
    collections,
    collectionFilterId,
    collectionsLoading,
    setLibraryCollectionFilter,
  ]);
}

export function useProfileLibraryFilters(args: UseProfileLibraryFiltersArgs) {
  const {
    searchParams,
    setSearchParams,
    userGames,
    collections,
    collectionsLoading,
    reloadUserGames,
    refreshCollections,
    t,
  } = args;

  const collectionFilterId = useMemo(
    () =>
      parseLibraryCollectionParam(
        searchParams.get(LIBRARY_COLLECTION_QUERY_KEY)
      ),
    [searchParams]
  );

  const libraryFilter = useMemo(
    () => parseLibraryStatusParam(searchParams.get(LIBRARY_STATUS_QUERY_KEY)),
    [searchParams]
  );

  const setLibraryFilter = useCallback(
    (next: LibraryStatusFilter) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (next === 'ALL') p.delete(LIBRARY_STATUS_QUERY_KEY);
          else p.set(LIBRARY_STATUS_QUERY_KEY, next);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setLibraryCollectionFilter = useCallback(
    (next: LibraryCollectionFilter) => {
      setSearchParams(
        prev => {
          const p = new URLSearchParams(prev);
          if (next === 'ALL') p.delete(LIBRARY_COLLECTION_QUERY_KEY);
          else p.set(LIBRARY_COLLECTION_QUERY_KEY, String(next));
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const derived = useProfileLibraryDerived(
    userGames,
    collectionFilterId,
    libraryFilter,
    t
  );

  useResetInvalidLibraryCollectionFilter(
    collections,
    collectionFilterId,
    collectionsLoading,
    setLibraryCollectionFilter
  );

  const activeCollectionMeta = useMemo(
    () =>
      typeof collectionFilterId === 'number'
        ? collections.find(c => c.id === collectionFilterId)
        : undefined,
    [collections, collectionFilterId]
  );

  const gameListCollectionProps = useMemo(() => {
    const canDetach =
      typeof collectionFilterId === 'number' &&
      activeCollectionMeta?.system_key !== 'MA_LUDOTHEQUE';
    if (!canDetach) return {};
    const colId = collectionFilterId;
    return {
      onDetachFromCollection: async (userGameId: number) => {
        try {
          await removeGameFromCollection(colId, userGameId);
          await reloadUserGames();
          await refreshCollections();
        } catch (err) {
          console.error(err);
        }
      },
      detachFromCollectionTitle: t('collections.profileDetachTooltip', {
        name:
          activeCollectionMeta?.name ?? t('collections.defaultCollectionName'),
      }),
    };
  }, [
    collectionFilterId,
    activeCollectionMeta?.system_key,
    activeCollectionMeta?.name,
    reloadUserGames,
    refreshCollections,
    t,
  ]);

  return {
    collectionFilterId,
    libraryFilter,
    setLibraryFilter,
    setLibraryCollectionFilter,
    activeCollectionMeta,
    gameListCollectionProps,
    ...derived,
  };
}
