import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ReviewSection from '../../../components/reviews/ReviewSection';
import { useReviews } from '../../../hooks/useReviews';
import { apiDelete } from '../../../services/api';

vi.mock('../../../hooks/useReviews', () => ({ useReviews: vi.fn() }));

vi.mock('../../../services/api', () => ({
  apiDelete: vi.fn(),
}));

vi.mock('../../../components/reviews/ReviewForm', () => ({
  default: ({ onSuccess, onCancel, initialValues }: any) => (
    <div data-testid="mock-review-form">
      {initialValues && <span data-testid="is-editing">Mode Édition</span>}
      <button
        data-testid="submit-form"
        onClick={() => onSuccess({ id: 999, content: 'Nouvel avis' })}
      >
        Soumettre
      </button>
      {onCancel && (
        <button data-testid="cancel-form" onClick={onCancel}>
          Annuler Édition
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../../components/reviews/ReviewCard', () => ({
  default: ({ onEdit, onDelete, review }: any) => (
    <div data-testid="mock-review-card">
      <span>{review.content}</span>
      <button data-testid="edit-card" onClick={() => onEdit(review)}>
        Modifier
      </button>
      <button data-testid="delete-card" onClick={() => onDelete(review.id)}>
        Supprimer
      </button>
    </div>
  ),
}));

vi.mock('../../../components/reviews/ReviewsList', () => ({
  default: ({ otherReviews, onEditReview, onDeleteReview }: any) => (
    <div data-testid="mock-reviews-list">
      <span data-testid="other-count">{otherReviews.length} avis autres</span>
      <button
        data-testid="edit-other"
        onClick={() => onEditReview({ id: 42, content: 'Autre avis' })}
      >
        Edit Other
      </button>
      <button data-testid="delete-other" onClick={() => onDeleteReview(42)}>
        Delete Other
      </button>
    </div>
  ),
}));

describe('ReviewSection', () => {
  const mockAddReview = vi.fn();
  const mockUpdateReview = vi.fn();
  const mockRemoveReview = vi.fn();
  const mockOnReviewChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useReviews).mockReturnValue({
      reviews: [],
      isLoading: false,
      error: null,
      addReview: mockAddReview,
      updateReview: mockUpdateReview,
      removeReview: mockRemoveReview,
    } as any);
  });

  it("affiche le formulaire si l'utilisateur n'a pas d'avis et gère la création", () => {
    render(
      <ReviewSection
        gameId="123"
        userReview={null}
        currentUserId={99}
        onReviewChange={mockOnReviewChange}
      />
    );

    expect(screen.getByTestId('mock-review-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('submit-form'));
    expect(mockOnReviewChange).toHaveBeenCalledWith({
      id: 999,
      content: 'Nouvel avis',
    });
    expect(mockAddReview).toHaveBeenCalledWith({
      id: 999,
      content: 'Nouvel avis',
    });
  });

  it("gère l'édition d'un avis existant et son annulation (incluant la valeur du rating)", () => {
    const userReview = {
      id: 10,
      content: 'Mon avis',
      rating: { value: 5 },
      user: { id: 99 },
    } as any;

    render(
      <ReviewSection
        gameId="123"
        userReview={userReview}
        currentUserId={99}
        onReviewChange={mockOnReviewChange}
      />
    );

    expect(screen.getByTestId('mock-review-card')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-review-form')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('edit-card'));
    expect(screen.getByTestId('mock-review-form')).toBeInTheDocument();
    expect(screen.getByTestId('is-editing')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-form'));
    expect(screen.getByTestId('mock-review-card')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('edit-card'));
    fireEvent.click(screen.getByTestId('submit-form'));

    expect(mockOnReviewChange).toHaveBeenCalled();
    expect(mockUpdateReview).toHaveBeenCalled();
  });

  it('gère la suppression de SON propre avis', async () => {
    const userReview = { id: 10, content: 'Mon avis', user: { id: 99 } } as any;
    vi.mocked(apiDelete).mockResolvedValueOnce({});

    render(
      <ReviewSection
        gameId="123"
        userReview={userReview}
        currentUserId={99}
        onReviewChange={mockOnReviewChange}
      />
    );

    fireEvent.click(screen.getByTestId('delete-card'));
    expect(screen.getByText('Supprimer votre avis ?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Annuler'));

    await waitFor(() => {
      expect(
        screen.queryByText('Supprimer votre avis ?')
      ).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('delete-card'));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/api/reviews/10/');
      expect(mockOnReviewChange).toHaveBeenCalledWith(null);
      expect(mockRemoveReview).toHaveBeenCalledWith(10);
    });
  });

  it("gère l'erreur lors de la suppression d'un avis", async () => {
    window.alert = vi.fn();
    const alertSpy = vi.spyOn(window, 'alert');
    const userReview = { id: 10, content: 'Mon avis', user: { id: 99 } } as any;
    vi.mocked(apiDelete).mockRejectedValueOnce(new Error('Erreur réseau'));

    render(
      <ReviewSection
        gameId="123"
        userReview={userReview}
        currentUserId={99}
        onReviewChange={mockOnReviewChange}
      />
    );

    fireEvent.click(screen.getByTestId('delete-card'));
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        "Erreur lors de la suppression de l'avis."
      );
    });
    alertSpy.mockRestore();
  });

  it('intègre correctement la liste des autres avis et permet de les supprimer', async () => {
    vi.mocked(apiDelete).mockResolvedValueOnce({});
    vi.mocked(useReviews).mockReturnValue({
      reviews: [{ id: 42, content: 'Autre avis' }],
      isLoading: false,
      error: null,
      removeReview: mockRemoveReview,
    } as any);

    render(
      <ReviewSection
        gameId="123"
        userReview={null}
        currentUserId={99}
        onReviewChange={mockOnReviewChange}
      />
    );

    expect(screen.getByTestId('other-count')).toHaveTextContent(
      '1 avis autres'
    );

    fireEvent.click(screen.getByTestId('edit-other'));
    expect(screen.getByTestId('mock-review-form')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-other'));
    expect(screen.getByText('Supprimer votre avis ?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/api/reviews/42/');
      expect(mockRemoveReview).toHaveBeenCalledWith(42);
      expect(mockOnReviewChange).not.toHaveBeenCalled();
    });
  });

  it('gère les branches défensives extrêmes (gameId vide, filtrage complet, early-return)', () => {
    vi.mocked(useReviews).mockReturnValue({
      reviews: [
        { id: 10, content: 'Mon avis' },
        { id: 42, content: 'Autre avis' },
      ],
      isLoading: true,
      error: 'Oups',
      removeReview: vi.fn(),
    } as any);

    const userReview = { id: 10, content: 'Mon avis' } as any;

    render(
      <ReviewSection
        gameId=""
        resolveGameId={async () => '123'}
        userReview={userReview}
        currentUserId={99}
        onReviewChange={mockOnReviewChange}
      />
    );

    expect(screen.getByTestId('other-count')).toHaveTextContent(
      '1 avis autres'
    );

    fireEvent.click(screen.getByTestId('delete-card'));
    fireEvent.click(screen.getByText('Annuler'));

    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    expect(apiDelete).not.toHaveBeenCalled();
  });

  it("couvre l'affichage complet en mode sombre", () => {
    const darkTheme = createTheme({ palette: { mode: 'dark' } });
    const userReview = { id: 10, content: 'Mon avis', user: { id: 99 } } as any;

    render(
      <ThemeProvider theme={darkTheme}>
        <ReviewSection
          gameId="123"
          userReview={userReview}
          currentUserId={99}
          onReviewChange={mockOnReviewChange}
        />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('delete-card'));
    expect(screen.getByText('Supprimer votre avis ?')).toBeInTheDocument();
  });
});
