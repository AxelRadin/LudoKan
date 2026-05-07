import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useIgdbSuggestions } from '../../hooks/useIgdbSuggestions';
import GameSearchBar from '../../components/GameSearchBar';

// --- MOCKS ---
vi.mock('../../hooks/useIgdbSuggestions', () => ({
  useIgdbSuggestions: vi.fn(),
}));

describe('GameSearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche les résultats et réagit au clic', () => {
    const mockSelect = vi.fn();
    const mockSetSuggestions = vi.fn();

    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [
        { igdb_id: 1, name: 'Zelda', cover_url: 'http://img.com/zelda.jpg' },
      ] as any,
      loading: false,
      error: null,
      setSuggestions: mockSetSuggestions,
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={mockSelect} />
      </MemoryRouter>
    );

    const input = screen.getByPlaceholderText(/Rechercher un jeu/i);
    fireEvent.focus(input);

    // Le jeu est affiché
    expect(screen.getByText('Zelda')).toBeInTheDocument();

    // Au clic, on appelle onSelect et on vide les suggestions
    fireEvent.click(screen.getByText('Zelda'));
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Zelda' })
    );
    expect(mockSetSuggestions).toHaveBeenCalledWith([]);
  });

  it('met à jour la valeur du champ lors de la frappe (onChange)', () => {
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [],
      loading: false,
      error: null,
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={vi.fn()} />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(
      /Rechercher un jeu/i
    ) as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'Mario' } });

    expect(input.value).toBe('Mario');
  });

  it("ferme le dropdown lors d'un clic à l'extérieur", () => {
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [{ igdb_id: 2, name: 'Halo' }] as any,
      loading: false,
      error: null,
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={vi.fn()} />
      </MemoryRouter>
    );

    // Focus pour ouvrir le dropdown
    fireEvent.focus(screen.getByPlaceholderText(/Rechercher un jeu/i));
    expect(screen.getByText('Halo')).toBeInTheDocument();

    // Clic en dehors du composant
    fireEvent.mouseDown(document.body);

    // Le dropdown doit être fermé
    expect(screen.queryByText('Halo')).not.toBeInTheDocument();
  });

  it("affiche l'état de chargement", () => {
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [],
      loading: true,
      error: null,
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={vi.fn()} />
      </MemoryRouter>
    );
    fireEvent.focus(screen.getByPlaceholderText(/Rechercher un jeu/i));

    expect(screen.getByText('Recherche…')).toBeInTheDocument();
  });

  it("affiche un message d'erreur", () => {
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [],
      loading: false,
      error: 'Connexion perdue',
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={vi.fn()} />
      </MemoryRouter>
    );
    fireEvent.focus(screen.getByPlaceholderText(/Rechercher un jeu/i));

    expect(screen.getByText('Erreur : Connexion perdue')).toBeInTheDocument();
  });

  it('affiche "Aucun résultat" quand la liste est vide', () => {
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [],
      loading: false,
      error: null,
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={vi.fn()} />
      </MemoryRouter>
    );
    const input = screen.getByPlaceholderText(/Rechercher un jeu/i);

    // Il faut qu'il y ait une valeur dans l'input pour afficher le menu déroulant
    fireEvent.change(input, { target: { value: 'Test' } });

    expect(screen.getByText('Aucun résultat')).toBeInTheDocument();
  });

  it("gère l'affichage complexe (sans cover, avec collection, et troncature des plateformes)", () => {
    const mockSelect = vi.fn();
    vi.mocked(useIgdbSuggestions).mockReturnValue({
      suggestions: [
        {
          igdb_id: 10,
          name: 'Super Mega Game',
          cover_url: null, // Couvre la ligne affichant '—'
          collections: [{ id: 42, name: 'Mega Franchise' }], // Couvre bestLicenseId
          platforms: [
            // Couvre la troncature des plateformes
            { name: 'PC' },
            { name: 'PS4' },
            { name: 'PS5' },
            { name: 'Xbox' },
          ],
        },
      ] as any,
      loading: false,
      error: null,
      setSuggestions: vi.fn(),
    });

    render(
      <MemoryRouter>
        <GameSearchBar onSelect={mockSelect} />
      </MemoryRouter>
    );
    fireEvent.focus(screen.getByPlaceholderText(/Rechercher un jeu/i));

    // Vérifie le rendu du placeholder pour la cover
    expect(screen.getByText('—')).toBeInTheDocument();

    // Vérifie la troncature des plateformes (3 max + '…')
    expect(screen.getByText('PC, PS4, PS5…')).toBeInTheDocument();

    // Vérifie le rendu du lien vers la licence
    const link = screen.getByText('Voir plus →');
    expect(link).toBeInTheDocument();

    fireEvent.click(link);
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
