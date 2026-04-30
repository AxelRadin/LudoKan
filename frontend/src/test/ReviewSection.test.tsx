import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReviewSection from '../components/reviews/ReviewSection';
import { useReviews } from '../hooks/useReviews';

vi.mock('../hooks/useReviews', () => ({ useReviews: vi.fn() }));
vi.mock('../components/reviews/ReviewForm', () => ({
  default: () => <div data-testid="mock-review-form" />,
}));
vi.mock('../components/reviews/ReviewsList', () => ({
  default: () => <div />,
}));

describe('ReviewSection', () => {
  it("affiche le formulaire si l'utilisateur n'a pas d'avis", () => {
    vi.mocked(useReviews).mockReturnValue({
      reviews: [],
      totalCount: 0,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      loadMoreError: null,
      hasNext: false,
      loadMorePage: vi.fn(),
      addReview: vi.fn(),
      updateReview: vi.fn(),
      removeReview: vi.fn(),
    } as any);

    render(
      <ReviewSection
        gameId="123"
        userReview={null}
        currentUserId={99}
        onReviewChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('mock-review-form')).toBeInTheDocument();
  });

  it("affiche la ReviewCard si l'utilisateur a déjà un avis", () => {
    vi.mocked(useReviews).mockReturnValue({
      reviews: [{ id: 10, user: { id: 99 } }],
      totalCount: 1,
      isLoading: false,
      isLoadingMore: false,
      error: null,
      loadMoreError: null,
      hasNext: false,
      loadMorePage: vi.fn(),
      addReview: vi.fn(),
      updateReview: vi.fn(),
      removeReview: vi.fn(),
    } as any);

    render(
      <ReviewSection
        gameId="123"
        userReview={{ id: 10, content: 'Mon avis' } as any}
        currentUserId={99}
        onReviewChange={vi.fn()}
      />
    );

    expect(screen.queryByTestId('mock-review-form')).not.toBeInTheDocument();
    expect(screen.getByText('Mon avis')).toBeInTheDocument();
  });
});
