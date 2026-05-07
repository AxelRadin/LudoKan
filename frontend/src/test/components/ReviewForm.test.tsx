import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReviewForm from '../../components/ReviewForm';
import { useAuth } from '../../contexts/useAuth';
import { useSubmitReview } from '../../hooks/useSubmitReview';

vi.mock('../../contexts/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../hooks/useSubmitReview', () => ({ useSubmitReview: vi.fn() }));

describe('ReviewForm', () => {
  const mockSubmitReview = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitReview).toHaveBeenCalledWith(
        '123',
        'Vraiment incroyable !'
      );
    });
  });

  it('appelle la fonction onSuccess si la soumission réussit', async () => {
    const mockOnSuccess = vi.fn();
    const mockResult = { id: 1, content: 'Avis de test' };
    mockSubmitReview.mockResolvedValueOnce(mockResult);

    render(<ReviewForm gameId="123" onSuccess={mockOnSuccess} />);

    const input = screen.getByPlaceholderText(/Partagez votre expérience/i);
    fireEvent.change(input, {
      target: { value: 'Un avis assez long pour être valide' },
    });

    const submitButton = screen.getByRole('button', {
      name: /Publier l'avis/i,
    });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockResult);
    });
  });

  it("affiche le message de connexion si l'utilisateur n'est pas authentifié", () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as any);

    render(<ReviewForm gameId="123" />);

    expect(
      screen.getByText('Connectez-vous pour écrire un avis.')
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText(/Partagez votre expérience/i)
    ).not.toBeInTheDocument();
  });

  it('affiche un message de succès (Alerte)', () => {
    vi.mocked(useSubmitReview).mockReturnValue({
      loading: false,
      success: true,
      error: null,
      submitReview: mockSubmitReview,
    } as any);

    render(<ReviewForm gameId="123" />);

    expect(screen.getByText('Avis publié avec succès !')).toBeInTheDocument();
  });

  it("affiche un message d'erreur (Alerte)", () => {
    vi.mocked(useSubmitReview).mockReturnValue({
      loading: false,
      success: false,
      error: 'Erreur lors de la publication',
      submitReview: mockSubmitReview,
    } as any);

    render(<ReviewForm gameId="123" />);

    expect(
      screen.getByText('Erreur lors de la publication')
    ).toBeInTheDocument();
  });

  it("affiche l'état de chargement et désactive le champ", () => {
    vi.mocked(useSubmitReview).mockReturnValue({
      loading: true,
      success: false,
      error: null,
      submitReview: mockSubmitReview,
    } as any);

    render(<ReviewForm gameId="123" />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Envoi...');

    const input = screen.getByPlaceholderText(/Partagez votre expérience/i);
    expect(input).toBeDisabled();
  });

  it('change la couleur du compteur si le texte dépasse 500 caractères', () => {
    render(<ReviewForm gameId="123" />);
    const input = screen.getByPlaceholderText(/Partagez votre expérience/i);

    const veryLongText = 'a'.repeat(501);
    fireEvent.change(input, { target: { value: veryLongText } });

    expect(screen.getByText('501 / 500')).toBeInTheDocument();

    const submitButton = screen.getByRole('button', {
      name: /Publier l'avis/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("gère une soumission réussie même si la prop onSuccess n'est pas fournie", async () => {
    mockSubmitReview.mockResolvedValueOnce({
      id: 99,
      content: 'Avis sans callback',
    });

    render(<ReviewForm gameId="123" />);

    const input = screen.getByPlaceholderText(/Partagez votre expérience/i);
    fireEvent.change(input, { target: { value: 'Avis suffisamment long !' } });

    const submitButton = await screen.findByRole('button', {
      name: /Publier l'avis/i,
    });
    await waitFor(() => expect(submitButton).not.toBeDisabled());

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSubmitReview).toHaveBeenCalled();
    });
  });
});
