import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { apiGet } from '../services/api';
import { searchIgdbGames } from '../api/igdb';
import SearchBar from '../components/SearchBar';

vi.mock('../services/api', () => ({ apiGet: vi.fn() }));
vi.mock('../api/igdb', () => ({ searchIgdbGames: vi.fn() }));

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('attend 280ms avant de lancer les recherches (Debounce)', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({ results: [] });
    vi.mocked(searchIgdbGames).mockResolvedValueOnce([]);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Recherchez des jeux/i), {
      target: { value: 'Zelda' },
    });

    expect(apiGet).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(280);
    });

    expect(apiGet).toHaveBeenCalled();
  });
});
