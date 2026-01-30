import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUserGames } from '../hooks/useUserGames';
import UserLibraryPage from '../pages/userLibraryPage';

vi.mock('../hooks/useUserGames', () => ({ useUserGames: vi.fn() }));

describe('UserLibraryPage', () => {
  it('affiche la liste et permet les actions', () => {
    const mockRemove = vi.fn();
    vi.mocked(useUserGames).mockReturnValue({
      games: [{ id: 99, status: 'playing', game: { id: 101 } }] as any,
      loading: false,
      error: null,
      addGame: vi.fn(),
      updateGame: vi.fn(),
      removeGame: mockRemove,
    });

    render(<UserLibraryPage />);
    expect(screen.getByText('playing', { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Supprimer'));
    expect(mockRemove).toHaveBeenCalledWith(99);
  });
});
