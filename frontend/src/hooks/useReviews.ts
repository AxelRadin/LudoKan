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
};

type UseReviewsReturn = {
  reviews: ReviewItem[];
  isLoading: boolean;
  error: string | null;
  addReview: (review: ReviewItem) => void;
  updateReview: (review: ReviewItem) => void;
  removeReview: (reviewId: number) => void;
};

export function useReviews(gameId: string | null): UseReviewsReturn {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    setIsLoading(true);
    setError(null);
    apiGet(`/api/reviews/?game=${gameId}`)
      .then((data: ReviewItem[] | { results: ReviewItem[] }) => {
        setReviews(Array.isArray(data) ? data : data.results);
      })
      .catch(() => setError('Impossible de charger les avis.'))
      .finally(() => setIsLoading(false));
  }, [gameId]);

  function addReview(review: ReviewItem) {
    setReviews(prev => [review, ...prev]);
  }

  function updateReview(review: ReviewItem) {
    setReviews(prev => prev.map(r => (r.id === review.id ? review : r)));
  }

  function removeReview(reviewId: number) {
    setReviews(prev => prev.filter(r => r.id !== reviewId));
  }

  return { reviews, isLoading, error, addReview, updateReview, removeReview };
}
