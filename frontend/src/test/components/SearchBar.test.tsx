import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { apiGet } from '../../services/api';
import { searchIgdbGames } from '../../api/igdb';
import SearchBar from '../../components/SearchBar';

vi.mock('../../services/api', () => ({ apiGet: vi.fn() }));
vi.mock('../../api/igdb', () => ({ searchIgdbGames: vi.fn() }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    vi.mocked(apiGet).mockResolvedValue({ results: [] });
    vi.mocked(searchIgdbGames).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('attend 280ms avant de lancer les recherches (Debounce)', async () => {
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
      vi.advanceTimersByTime(300);
    });

    expect(apiGet).toHaveBeenCalled();
  });

  it('fusionne les résultats locaux et IGDB, et affiche les images et les dates', async () => {
    vi.mocked(apiGet).mockResolvedValueOnce({
      results: [
        {
          id: 100,
          igdb_id: 1,
          name: 'Zelda Local',
          release_date: '2020-01-01',
          cover_url: 'http://test.com/cover.jpg',
        },
      ],
    });
    vi.mocked(searchIgdbGames).mockResolvedValueOnce([
      { igdb_id: 2, name: 'Zelda IGDB' },
      { igdb_id: 1, name: 'Zelda Doublon' },
    ] as any);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Recherchez des jeux/i), {
      target: { value: 'Zel' },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.some(b => b.textContent?.includes('Zelda Local'))).toBe(
        true
      );
    });

    const img = screen.getByAltText('Zelda Local');
    expect(img).toHaveAttribute('src', 'http://test.com/cover.jpg');

    expect(screen.getByText('2020')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons.some(b => b.textContent?.includes('Zelda IGDB'))).toBe(true);
    expect(buttons.some(b => b.textContent?.includes('Zelda Doublon'))).toBe(
      false
    );

    const zeldaLocalBtn = buttons.find(b =>
      b.textContent?.includes('Zelda Local')
    ) as HTMLElement;
    fireEvent.click(zeldaLocalBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/game/100');
  });

  it('permet la navigation au clavier (Flèches, Enter, Escape)', async () => {
    vi.mocked(searchIgdbGames).mockResolvedValueOnce([
      { igdb_id: 10, name: 'Doom' },
      { igdb_id: 20, name: 'Doom 2' },
    ] as any);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Recherchez/i);

    fireEvent.change(input, { target: { value: 'Doom' } });
    fireEvent.focus(input);

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    await waitFor(() =>
      expect(screen.getAllByText(/Doom/i)[0]).toBeInTheDocument()
    );

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/game/igdb/10');
  });

  it('navigue vers la recherche complète si Entrée est pressé sans sélection', async () => {
    vi.mocked(searchIgdbGames).mockResolvedValueOnce([
      { igdb_id: 10, name: 'Doom' },
    ] as any);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Recherchez/i);

    fireEvent.change(input, { target: { value: 'Doom' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=Doom');
  });

  it("ne fait rien si Entrée est pressé avec une recherche uniquement composée d'espaces", () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Recherchez/i);

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.focus(input);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("ferme le dropdown au clic à l'extérieur", async () => {
    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Recherchez/i);

    fireEvent.change(input, { target: { value: 'Test' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText('RÉSULTATS')).toBeInTheDocument();
    });

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('RÉSULTATS')).not.toBeInTheDocument();
  });

  it('gère les erreurs d\'API et affiche le bouton de fallback "Recherche complète"', async () => {
    vi.mocked(apiGet).mockRejectedValueOnce(new Error('Erreur local'));
    vi.mocked(searchIgdbGames).mockRejectedValueOnce(new Error('Erreur IGDB'));

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Recherchez/i);

    fireEvent.change(input, { target: { value: 'Rien' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
    });

    const fallbackBtn = screen.getByText(
      'Recherche complète, filtres et pagination'
    );
    fireEvent.click(fallbackBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=Rien');
  });

  it('bouton "Voir tous les résultats" navigue vers la recherche complète', async () => {
    vi.mocked(searchIgdbGames).mockResolvedValueOnce([
      { igdb_id: 50, name: 'Halo' },
    ] as any);

    render(
      <MemoryRouter>
        <SearchBar />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByPlaceholderText(/Recherchez/i), {
      target: { value: 'Halo' },
    });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getAllByText(/Halo/i)[0]).toBeInTheDocument();
    });

    const fullSearchBtn = screen.getByText(/Voir tous les résultats pour/i);
    fireEvent.click(fullSearchBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=Halo');
  });
});
