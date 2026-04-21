import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuth } from '../contexts/useAuth';
import { useSubmitReview } from '../hooks/useSubmitReview';
import ReviewForm from '../components/ReviewForm';

vi.mock('../contexts/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../hooks/useSubmitReview', () => ({ useSubmitReview: vi.fn() }));

describe('ReviewForm', () => {
  const mockSubmitReview = vi.fn();

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    vi.mocked(useSubmitReview).mockReturnValue({
      loading: false,
      success: false,
      error: null,
      submitReview: mockSubmitReview,
    } as any);
  });

  it('soumet le formulaire après validation', async () => {
    render(<ReviewForm gameId="123" />);

    const input = screen.getByPlaceholderText(/Partagez votre expérience/i);
    fireEvent.change(input, { target: { value: 'Vraiment incroyable !' } });

    const submitButton = await screen.findByRole('button', {
      name: /Publier l'avis/i,
    });
    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitReview).toHaveBeenCalledWith(
        '123',
        'Vraiment incroyable !'
      );
    });
  });
});
