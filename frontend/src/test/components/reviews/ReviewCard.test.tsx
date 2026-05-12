import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ReviewCard from '../../../components/reviews/ReviewCard';

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ReviewCard', () => {
  const mockReview = { id: 1, content: 'Top', user: { id: 99 } };

  it("n'affiche pas le menu d'actions si non propriétaire", () => {
    renderWithRouter(
      <ReviewCard
        review={mockReview}
        isOwner={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('affiche le menu et appelle onEdit', () => {
    const mockOnEdit = vi.fn();
    renderWithRouter(
      <ReviewCard
        review={mockReview}
        isOwner={true}
        onEdit={mockOnEdit}
        onDelete={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Modifier'));

    expect(mockOnEdit).toHaveBeenCalledWith(mockReview);
  });

  it('affiche le menu et appelle onDelete', () => {
    const mockOnDelete = vi.fn();
    renderWithRouter(
      <ReviewCard
        review={mockReview}
        isOwner={true}
        onEdit={vi.fn()}
        onDelete={mockOnDelete}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Supprimer'));

    expect(mockOnDelete).toHaveBeenCalledWith(mockReview.id);
  });

  it('gère le survol de la souris (hover)', () => {
    const { container } = renderWithRouter(
      <ReviewCard
        review={mockReview}
        isOwner={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const cardBox = container.firstChild as HTMLElement;

    expect(cardBox).toBeInTheDocument();

    fireEvent.mouseEnter(cardBox);
    expect(cardBox).toBeInTheDocument();

    fireEvent.mouseLeave(cardBox);
    expect(cardBox).toBeInTheDocument();
  });

  it('affiche les détails complets (note, titre, date_created, pseudo)', () => {
    const fullReview = {
      id: 2,
      title: 'Super jeu',
      content: 'Vraiment cool',
      rating: { value: 4.2 },
      date_created: '2023-01-15T10:00:00Z',
      user: { id: 1, pseudo: 'GamerDu13', review_count: 5 },
    };

    renderWithRouter(
      <ReviewCard
        review={fullReview}
        isOwner={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('GamerDu13')).toBeInTheDocument();
    expect(screen.getByText('GA')).toBeInTheDocument();
    expect(screen.getByText('5 avis publiés')).toBeInTheDocument();
    expect(screen.getByText('Super jeu')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('Bon')).toBeInTheDocument();
    expect(screen.getByText(/15 janvier 2023/i)).toBeInTheDocument();
  });

  it('utilise les valeurs de repli (username, created_at, 1 avis, Anonyme)', () => {
    const fallbackReview1 = {
      id: 3,
      content: 'Test fallback',
      created_at: '2023-02-20T10:00:00Z',
      user: { id: 2, username: 'UserLogin', review_count: 1 },
    };

    const { unmount } = renderWithRouter(
      <ReviewCard
        review={fallbackReview1}
        isOwner={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('UserLogin')).toBeInTheDocument();
    expect(screen.getByText('1 avis publié')).toBeInTheDocument();
    expect(screen.getByText(/20 février 2023/i)).toBeInTheDocument();

    unmount();

    const fallbackReview2 = {
      id: 4,
      content: 'Test Anonyme',
    };

    renderWithRouter(
      <ReviewCard
        review={fallbackReview2}
        isOwner={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Anonyme')).toBeInTheDocument();
    expect(screen.getByText('AN')).toBeInTheDocument();
  });
});
