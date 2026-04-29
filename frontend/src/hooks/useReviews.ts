import i18n from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { apiGet } from '../services/api';
import {
  appendUniqueByReviewId,
  drfNextToApiPath,
  normalizePaginatedOrArray,
  type PaginatedResults,
} from '../utils/reviewsPagination';

type ReviewUser = { id: number; pseudo?: string; username?: string };
type ReviewRating = { value: number };

export type ReviewItem = {
  id: number;
  /** Entrée liste « note seule » (pas d’avis texte), id = 1e9 + rating.id côté API */
  rating_only?: boolean;
  user?: ReviewUser;
  content: string;
  title?: string;
  rating?: ReviewRating;
  date_created?: string;
  created_at?: string;
};

function reviewMatchesStarFilter(review: ReviewItem, stars: number): boolean {
  const v = review.rating?.value;
  if (v == null) return false;
  return Math.round(Number(v)) === stars;
}

function buildReviewsListUrl(
  gameId: string,
  page: number,
  reviewStarFilter: number | null
): string {
  const params = new URLSearchParams();
  params.set('game', gameId);
  params.set('page', String(page));
  if (reviewStarFilter != null) {
    params.set('rating_value', String(reviewStarFilter));
  }
  return `/api/reviews/?${params.toString()}`;
}

type UseReviewsReturn = {
  reviews: ReviewItem[];
  totalCount: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  hasNext: boolean;
  loadMorePage: () => void;
  addReview: (review: ReviewItem) => void;
  updateReview: (review: ReviewItem) => void;
  removeReview: (reviewId: number) => void;
};

export function useReviews(
  gameId: string | null,
  reviewStarFilter: number | null = null
): UseReviewsReturn {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) {
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

    const url = buildReviewsListUrl(gameId, 1, reviewStarFilter);
    apiGet(url)
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
  }, [gameId, reviewStarFilter]);

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

  function addReview(review: ReviewItem) {
    if (
      reviewStarFilter != null &&
      !reviewMatchesStarFilter(review, reviewStarFilter)
    ) {
      return;
    }
    setReviews(prev => [review, ...prev]);
    setTotalCount(c => c + 1);
  }

  function updateReview(review: ReviewItem) {
    setReviews(prev => {
      const mapped = prev.map(r => (r.id === review.id ? review : r));
      if (reviewStarFilter == null) return mapped;
      return mapped.filter(r => reviewMatchesStarFilter(r, reviewStarFilter));
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
    addReview,
    updateReview,
    removeReview,
  };
}
