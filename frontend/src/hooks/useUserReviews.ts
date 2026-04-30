import { useMemo } from 'react';
import {
  buildUserReviewsListUrl,
  type UserReviewsListFilters,
} from '../constants/userReviewsFilters';
import { useDebouncedValue } from './useDebouncedValue';
import { useReviewsPaginatedQuery } from './useReviewsPaginatedQuery';

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

  const {
    reviews,
    setReviews,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext,
    loadMorePage,
    removeReview,
    reload,
  } = useReviewsPaginatedQuery<ReviewItem>(listUrl);

  function updateReview(review: ReviewItem) {
    setReviews(prev => {
      const mapped = prev.map(r => (r.id === review.id ? review : r));
      return mapped.filter(r => reviewMatchesFilters(r, effectiveFilters));
    });
  }

  return {
    reviews,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext,
    loadMorePage,
    updateReview,
    removeReview,
    refresh: reload,
  };
}
