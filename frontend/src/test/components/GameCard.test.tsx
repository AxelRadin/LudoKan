import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { GameCard } from '../../components/GameCard';
import { useAuth } from '../../contexts/useAuth';
import { resolveGameIdIfNeeded, addGameToLibrary } from '../../api/igdb';

// --- Mocks ---

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../contexts/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../api/igdb', () => ({
  resolveGameIdIfNeeded: vi.fn(),
  addGameToLibrary: vi.fn(),
}));

describe('GameCard', () => {
  const mockNavigate = vi.fn();

  const baseGame = {
    igdb_id: 100,
    name: 'Zelda: Ocarina of Time',
    cover_url: 'http://image.url',
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as any);
  });

  // --- Tests de Rendu et Fallbacks ---

  it('gère correctement un jeu sans image de couverture (fallback URL vide)', () => {
    const gameWithoutCover = { ...baseGame, cover_url: undefined };

    render(
      <MemoryRouter>
        <GameCard game={gameWithoutCover} />
      </MemoryRouter>
    );

    const imgElement = screen.getByRole('img');

    expect(imgElement).toBeInTheDocument();
    expect(imgElement).not.toHaveAttribute('src');
  });

  // --- Tests de Navigation ---

  it("navigue vers /game/igdb/{id} au clic si le jeu n'a pas de django_id", () => {
    render(
      <MemoryRouter>
        <GameCard game={baseGame} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('img'));
    expect(mockNavigate).toHaveBeenCalledWith('/game/igdb/100');
  });

  it('navigue vers /game/{id} au clic si le jeu possède un django_id', () => {
    const gameWithDjangoId = { ...baseGame, django_id: 50 };
    render(
      <MemoryRouter>
        <GameCard game={gameWithDjangoId} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('img'));
    expect(mockNavigate).toHaveBeenCalledWith('/game/50');
  });

  // --- Tests du bouton "Ajouter" ---

  it("n'affiche pas le bouton ajouter si l'utilisateur n'est pas connecté", () => {
    render(
      <MemoryRouter>
        <GameCard game={baseGame} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('affiche le bouton ajouter même si le jeu a un django_id (non ajouté à la bibliothèque)', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    const gameWithDjangoId = { ...baseGame, django_id: 50 };

    render(
      <MemoryRouter>
        <GameCard game={gameWithDjangoId} />
      </MemoryRouter>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('ajoute le jeu à la bibliothèque au clic sur le bouton (Succès)', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    vi.mocked(resolveGameIdIfNeeded).mockResolvedValueOnce({
      game_id: 999,
    } as any);
    vi.mocked(addGameToLibrary).mockResolvedValueOnce({} as any);

    render(
      <MemoryRouter>
        <GameCard game={baseGame} />
      </MemoryRouter>
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    expect(mockNavigate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(resolveGameIdIfNeeded).toHaveBeenCalledWith(baseGame);
      expect(addGameToLibrary).toHaveBeenCalledWith(999);
    });
  });

  it('gère l\'erreur lors de l\'ajout (passe quand même en "added" selon la logique actuelle)', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    vi.mocked(resolveGameIdIfNeeded).mockRejectedValueOnce(
      new Error('Erreur API')
    );

    render(
      <MemoryRouter>
        <GameCard game={baseGame} />
      </MemoryRouter>
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(resolveGameIdIfNeeded).toHaveBeenCalled();
      expect(screen.getByLabelText('Ajouté !')).toBeInTheDocument();
    });
  });

  it('ne fait rien si le jeu est déjà ajouté (already added)', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);
    const addedGame = { ...baseGame, user_library: { id: 1 } };

    render(
      <MemoryRouter>
        <GameCard game={addedGame} />
      </MemoryRouter>
    );

    const addButton = screen.getByRole('button');
    fireEvent.click(addButton);

    expect(resolveGameIdIfNeeded).not.toHaveBeenCalled();
  });

  // --- Tests du Badge Steam ---

  it('affiche le badge Steam avec le temps de jeu si applicable', () => {
    const steamGame = {
      ...baseGame,
      steam_appid: 12345,
      user_library: { playtime_forever: 42 },
    };

    render(
      <MemoryRouter>
        <GameCard game={steamGame} />
      </MemoryRouter>
    );

    expect(screen.getByText('42h')).toBeInTheDocument();
  });

  it("n'affiche pas le badge Steam si playtime_forever est 0 ou null", () => {
    const steamGame = {
      ...baseGame,
      steam_appid: 12345,
      user_library: { playtime_forever: 0 },
    };

    render(
      <MemoryRouter>
        <GameCard game={steamGame} />
      </MemoryRouter>
    );

    expect(screen.queryByText('0h')).not.toBeInTheDocument();
  });
});
