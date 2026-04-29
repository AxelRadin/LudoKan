import { useEffect, useState } from 'react';
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

type UseUserReviewsReturn = {
  reviews: ReviewItem[];
  isLoading: boolean;
  error: string | null;
  updateReview: (review: ReviewItem) => void;
  removeReview: (reviewId: number) => void;
  refresh: () => void;
};

export function useUserReviews(userId: number | null): UseUserReviewsReturn {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    apiGet(`/api/reviews/?user=${userId}`)
      .then((data: ReviewItem[] | { results: ReviewItem[] }) => {
        setReviews(Array.isArray(data) ? data : data.results);
      })
      .catch(() => setError('Impossible de charger vos avis.'))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  function updateReview(review: ReviewItem) {
    setReviews(prev => prev.map(r => (r.id === review.id ? review : r)));
  }

  function removeReview(reviewId: number) {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  }

  return {
    reviews,
    isLoading,
    error,
    updateReview,
    removeReview,
    refresh: fetchReviews,
  };
}
