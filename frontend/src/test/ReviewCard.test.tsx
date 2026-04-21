import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReviewCard from '../components/reviews/ReviewCard';

describe('ReviewCard', () => {
  const mockReview = { id: 1, content: 'Top', user: { id: 99 } };

  it("n'affiche pas le menu d'actions si non propriétaire", () => {
    render(
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
    render(
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
});
