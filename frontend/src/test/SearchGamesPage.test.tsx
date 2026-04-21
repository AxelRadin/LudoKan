import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useIgdbSearch } from '../hooks/useIgdbSearch';
import SearchGamesPage from '../pages/SearchGamesPage';

vi.mock('../hooks/useIgdbSearch', () => ({ useIgdbSearch: vi.fn() }));

describe('SearchGamesPage', () => {
  it('affiche le résultat de la recherche', () => {
    vi.mocked(useIgdbSearch).mockReturnValue({
      results: [{ id: 1, name: 'Zelda' } as any],
      loading: false,
      error: null,
    });

    render(<SearchGamesPage />);
    fireEvent.change(screen.getByPlaceholderText(/Ex:/i), {
      target: { value: 'Zel' },
    });

    expect(screen.getByText('Zelda')).toBeInTheDocument();
  });
});
