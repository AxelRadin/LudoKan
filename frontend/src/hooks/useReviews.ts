import { useMemo } from 'react';
import { useReviewsPaginatedQuery } from './useReviewsPaginatedQuery';

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
  const listUrl = useMemo(
    () => (gameId ? buildReviewsListUrl(gameId, 1, reviewStarFilter) : null),
    [gameId, reviewStarFilter]
  );

  const {
    reviews,
    setReviews,
    totalCount,
    setTotalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext,
    loadMorePage,
    removeReview,
  } = useReviewsPaginatedQuery<ReviewItem>(listUrl);

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

  return {
    reviews,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    loadMoreError,
    hasNext,
    loadMorePage,
    addReview,
    updateReview,
    removeReview,
  };
}
