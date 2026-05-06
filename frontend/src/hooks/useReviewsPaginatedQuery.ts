import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  appendUniqueByReviewId,
  drfNextToApiPath,
  fetchNormalizedReviewPage,
} from '../utils/reviewsPagination';

export type UseReviewsPaginatedQueryReturn<T extends { id: number }> = {
  reviews: T[];
  setReviews: Dispatch<SetStateAction<T[]>>;
  totalCount: number;
  setTotalCount: Dispatch<SetStateAction<number>>;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  hasNext: boolean;
  loadMorePage: () => Promise<void>;
  removeReview: (reviewId: number) => void;
  /** Recharge la première page (même URL que `listUrl`). */
  reload: () => Promise<void>;
};

/**
 * État + fetch paginé DRF partagé par useReviews et useUserReviews.
 * Les hooks appelants fournissent l’URL de la première page (ou null pour vider).
 */
export function useReviewsPaginatedQuery<T extends { id: number }>(
  listUrl: string | null
): UseReviewsPaginatedQueryReturn<T> {
  const [reviews, setReviews] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!listUrl) {
      setReviews([]);
      setTotalCount(0);
      setNextUrl(null);
      setError(null);
      setLoadMoreError(null);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setLoadMoreError(null);

    fetchNormalizedReviewPage<T>(listUrl)
      .then(norm => {
        if (cancelled) return;
        setReviews(norm.rows);
        setTotalCount(norm.totalCount);
        setNextUrl(norm.nextUrl);
      })
      .catch(() => {
        if (!cancelled) {
          setError(i18n.t('gamePageBody.reviewsLoadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listUrl]);

  const loadMorePage = useCallback(async () => {
    const path = drfNextToApiPath(nextUrl);
    if (!path || isLoadingMore) return;

    setLoadMoreError(null);
    setIsLoadingMore(true);
    try {
      const { rows, nextUrl: nu } = await fetchNormalizedReviewPage<T>(path);
      setReviews(prev => appendUniqueByReviewId(prev, rows));
      setNextUrl(nu);
    } catch {
      setLoadMoreError(i18n.t('gamePageBody.reviewsLoadError'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextUrl, isLoadingMore]);

  const reload = useCallback(async () => {
    if (!listUrl) return;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    try {
      const norm = await fetchNormalizedReviewPage<T>(listUrl);
      setReviews(norm.rows);
      setTotalCount(norm.totalCount);
      setNextUrl(norm.nextUrl);
    } catch {
      setError(i18n.t('gamePageBody.reviewsLoadError'));
    } finally {
      setIsLoading(false);
    }
  }, [listUrl]);

  const removeReview = useCallback((reviewId: number) => {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setTotalCount(c => Math.max(0, c - 1));
  }, []);

  return {
    reviews,
    setReviews,
    totalCount,
    setTotalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext: Boolean(nextUrl),
    loadMorePage,
    removeReview,
    reload,
  };
}
