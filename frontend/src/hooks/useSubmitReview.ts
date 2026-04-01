import { useState } from 'react';
import { apiPatch, apiPost } from '../services/api';

type ReviewResult = {
  id: number;
  title?: string;
  content: string;
  [key: string]: unknown;
};

type UseSubmitReviewReturn = {
  loading: boolean;
  success: boolean;
  error: string | null;
  submitReview: (
    gameId: string,
    content: string,
    existingReviewId?: number,
    title?: string,
    rating?: number
  ) => Promise<ReviewResult | null>;
};

export function useSubmitReview(): UseSubmitReviewReturn {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReview(
    gameId: string,
    content: string,
    existingReviewId?: number,
    title?: string,
    rating?: number
  ): Promise<ReviewResult | null> {
    setLoading(true);
    setSuccess(false);
    setError(null);

    const payload: Record<string, unknown> = { game: gameId, content };
    if (title) payload.title = title;
    if (rating) payload.rating_value = rating;

    try {
      let result: ReviewResult;
      if (existingReviewId) {
        result = await apiPatch(`/api/reviews/${existingReviewId}/`, payload);
      } else {
        result = await apiPost('/api/reviews/', payload);
      }
      setSuccess(true);
      return result;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de l'envoi de l'avis";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { loading, success, error, submitReview };
}
