import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useIgdbSuggestions } from '../hooks/useIgdbSuggestions';
import GameSearchBar from '../components/GameSearchBar';

vi.mock('../hooks/useIgdbSuggestions', () => ({ useIgdbSuggestions: vi.fn() }));

describe('GameSearchBar', () => {
  it('affiche les résultats et réagit au clic', () => {
    const mockSelect = vi.fn();
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [{ igdb_id: 1, name: 'Zelda' }] as any,
      loading: false,
      error: null,
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={mockSelect} />
      </MemoryRouter>
    );

    fireEvent.focus(screen.getByPlaceholderText(/Rechercher/i));
    fireEvent.click(screen.getByText('Zelda'));

    expect(mockSelect).toHaveBeenCalled();
  });
});
