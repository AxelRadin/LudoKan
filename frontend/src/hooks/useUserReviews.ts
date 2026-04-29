import i18n from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet } from '../services/api';
import {
  buildUserReviewsListUrl,
  type UserReviewsListFilters,
} from '../constants/userReviewsFilters';
import {
  appendUniqueByReviewId,
  drfNextToApiPath,
  normalizePaginatedOrArray,
  type PaginatedResults,
} from '../utils/reviewsPagination';
import { useDebouncedValue } from './useDebouncedValue';

type ReviewUser = { id: number; pseudo?: string; username?: string };
type ReviewRating = { value: number };

export type ReviewItem = {
  id: number;
  user?: ReviewUser;
  content: string;
  title?: string;
  rating?: ReviewRating;
  date_created?: string;
  created_at?: string;
  game: {
    id: number;
    name: string;
    cover_url?: string;
  };
};

function reviewMatchesFilters(
  review: ReviewItem,
  f: UserReviewsListFilters
): boolean {
  if (f.ratingFilter === 'none') {
    if (review.rating?.value != null) {
      return false;
    }
  } else if (f.ratingFilter !== 'all') {
    const v = review.rating?.value;
    if (v == null || Math.round(Number(v)) !== f.ratingFilter) {
      return false;
    }
  }
  const q = f.search.trim().toLowerCase();
  if (q && !(review.game.name || '').toLowerCase().includes(q)) {
    return false;
  }
  return true;
}

type UseUserReviewsReturn = {
  reviews: ReviewItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  hasNext: boolean;
  loadMorePage: () => void;
  updateReview: (review: ReviewItem) => void;
  removeReview: (reviewId: number) => void;
  refresh: () => void;
};

export function useUserReviews(
  userId: number | null,
  filters: UserReviewsListFilters
): UseUserReviewsReturn {
  const searchDebounced = useDebouncedValue(filters.search, 400);
  const effectiveFilters = useMemo(
    (): UserReviewsListFilters => ({
      ...filters,
      search: searchDebounced,
    }),
    [filters.ratingFilter, filters.ordering, searchDebounced]
  );

  const listUrl = useMemo(() => {
    if (!userId) return null;
    return buildUserReviewsListUrl(userId, effectiveFilters);
  }, [userId, effectiveFilters]);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !listUrl) {
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

    apiGet(listUrl)
      .then((data: ReviewItem[] | PaginatedResults<ReviewItem>) => {
        if (cancelled) return;
        const {
          rows,
          totalCount: tc,
          nextUrl: nu,
        } = normalizePaginatedOrArray<ReviewItem>(data);
        setReviews(rows);
        setTotalCount(tc);
        setNextUrl(nu);
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
  }, [userId, listUrl]);

  const loadMorePage = useCallback(async () => {
    const path = drfNextToApiPath(nextUrl);
    if (!path || isLoadingMore) return;

    setLoadMoreError(null);
    setIsLoadingMore(true);
    try {
      const data = (await apiGet(path)) as
        | ReviewItem[]
        | PaginatedResults<ReviewItem>;
      const { rows, nextUrl: nu } = normalizePaginatedOrArray<ReviewItem>(data);
      setReviews(prev => appendUniqueByReviewId(prev, rows));
      setNextUrl(nu);
    } catch {
      setLoadMoreError(i18n.t('gamePageBody.reviewsLoadError'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextUrl, isLoadingMore]);

  const refresh = useCallback(() => {
    if (!userId || !listUrl) return;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    apiGet(listUrl)
      .then((data: ReviewItem[] | PaginatedResults<ReviewItem>) => {
        const {
          rows,
          totalCount: tc,
          nextUrl: nu,
        } = normalizePaginatedOrArray<ReviewItem>(data);
        setReviews(rows);
        setTotalCount(tc);
        setNextUrl(nu);
      })
      .catch(() => setError(i18n.t('gamePageBody.reviewsLoadError')))
      .finally(() => setIsLoading(false));
  }, [userId, listUrl]);

  function updateReview(review: ReviewItem) {
    setReviews(prev => {
      const mapped = prev.map(r => (r.id === review.id ? review : r));
      return mapped.filter(r => reviewMatchesFilters(r, effectiveFilters));
    });
  }

  function removeReview(reviewId: number) {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
    setTotalCount(c => Math.max(0, c - 1));
  }

  return {
    reviews,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext: Boolean(nextUrl),
    loadMorePage,
    updateReview,
    removeReview,
    refresh,
  };
}
