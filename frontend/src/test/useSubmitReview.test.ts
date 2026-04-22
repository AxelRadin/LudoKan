import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiPost, apiPatch } from '../services/api';
import { useSubmitReview } from '../hooks/useSubmitReview';

vi.mock('../services/api', () => ({
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
}));

describe('useSubmitReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initialise avec les bons états par défaut', () => {
    const { result } = renderHook(() => useSubmitReview());
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('crée un nouvel avis avec apiPost', async () => {
    const mockResult = { id: 1, content: 'Super jeu !' };
    vi.mocked(apiPost).mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useSubmitReview());

    let submitResponse;
    await act(async () => {
      submitResponse = await result.current.submitReview(
        'game123',
        'Super jeu !',
        undefined,
        'Mon Titre',
        5
      );
    });

    expect(apiPost).toHaveBeenCalledWith('/api/reviews/', {
      game: 'game123',
      content: 'Super jeu !',
      title: 'Mon Titre',
      rating_value: 5,
    });

    expect(submitResponse).toEqual(mockResult);
    expect(result.current.success).toBe(true);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('met à jour un avis existant avec apiPatch si un ID est fourni', async () => {
    const mockResult = { id: 99, content: 'Avis modifié' };
    vi.mocked(apiPatch).mockResolvedValueOnce(mockResult);

    const { result } = renderHook(() => useSubmitReview());

    await act(async () => {
      await result.current.submitReview('game123', 'Avis modifié', 99);
    });

    expect(apiPatch).toHaveBeenCalledWith('/api/reviews/99/', {
      game: 'game123',
      content: 'Avis modifié',
    });
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('gère les erreurs lors de la soumission', async () => {
    vi.mocked(apiPost).mockRejectedValueOnce(new Error('Erreur serveur'));

    const { result } = renderHook(() => useSubmitReview());

    await act(async () => {
      const res = await result.current.submitReview('game123', 'Test');
      expect(res).toBeNull();
    });

    expect(result.current.error).toBe('Erreur serveur');
    expect(result.current.success).toBe(false);
  });
});
