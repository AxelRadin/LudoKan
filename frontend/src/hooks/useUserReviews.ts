import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';

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

type PaginatedReviews = {
  count: number;
  next: string | null;
  previous: string | null;
  results: ReviewItem[];
};

function isPaginated(data: unknown): data is PaginatedReviews {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray((data as PaginatedReviews).results)
  );
}

function appendUniqueReviews(
  prev: ReviewItem[],
  incoming: ReviewItem[]
): ReviewItem[] {
  const seen = new Set(prev.map(r => r.id));
  const extra = incoming.filter(r => !seen.has(r.id));
  return [...prev, ...extra];
}

function toApiPath(nextUrl: string | null): string | null {
  if (!nextUrl) return null;
  try {
    const u = new URL(nextUrl);
    return `${u.pathname}${u.search}`;
  } catch {
    return nextUrl.startsWith('/') ? nextUrl : null;
  }
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

export function useUserReviews(userId: number | null): UseUserReviewsReturn {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
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

    apiGet(`/api/reviews/?user=${userId}`)
      .then((data: ReviewItem[] | PaginatedReviews) => {
        if (cancelled) return;
        if (Array.isArray(data)) {
          setReviews(data);
          setTotalCount(data.length);
          setNextUrl(null);
        } else if (isPaginated(data)) {
          setReviews(data.results);
          setTotalCount(data.count);
          setNextUrl(data.next);
        } else {
          setReviews([]);
          setTotalCount(0);
          setNextUrl(null);
        }
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
  }, [userId]);

  const loadMorePage = useCallback(async () => {
    const path = toApiPath(nextUrl);
    if (!path || isLoadingMore) return;

    setLoadMoreError(null);
    setIsLoadingMore(true);
    try {
      const data = (await apiGet(path)) as ReviewItem[] | PaginatedReviews;
      if (Array.isArray(data)) {
        setReviews(prev => appendUniqueReviews(prev, data));
        setNextUrl(null);
      } else if (isPaginated(data)) {
        setReviews(prev => appendUniqueReviews(prev, data.results));
        setNextUrl(data.next);
      }
    } catch {
      setLoadMoreError(i18n.t('gamePageBody.reviewsLoadError'));
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextUrl, isLoadingMore]);

  const refresh = useCallback(() => {
    if (!userId) return;
    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setLoadMoreError(null);
    apiGet(`/api/reviews/?user=${userId}`)
      .then((data: ReviewItem[] | PaginatedReviews) => {
        if (Array.isArray(data)) {
          setReviews(data);
          setTotalCount(data.length);
          setNextUrl(null);
        } else if (isPaginated(data)) {
          setReviews(data.results);
          setTotalCount(data.count);
          setNextUrl(data.next);
        } else {
          setReviews([]);
          setTotalCount(0);
          setNextUrl(null);
        }
      })
      .catch(() => setError(i18n.t('gamePageBody.reviewsLoadError')))
      .finally(() => setIsLoading(false));
  }, [userId]);

  function updateReview(review: ReviewItem) {
    setReviews(prev => prev.map(r => (r.id === review.id ? review : r)));
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
