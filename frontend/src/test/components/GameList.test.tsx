import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import GameList from '../../components/GameList';

describe('GameList', () => {
  it('affiche un message quand la liste est vide', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Aucun jeu à afficher.')).toBeInTheDocument();
  });

  // --- Title Parsing Tests ---
  it('affiche le titre simple sans compteur', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} title="Mes Jeux" />
      </MemoryRouter>
    );
    expect(screen.getByText('Mes Jeux')).toBeInTheDocument();
  });

  it('parse et affiche le compteur depuis le titre (parenthèses)', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} title="Jeux Terminés (42)" />
      </MemoryRouter>
    );
    expect(screen.getByText('Jeux Terminés')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('ne parse pas le compteur si ce ne sont pas des chiffres purs', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} title="Mon super jeu (Edition Spéciale)" />
      </MemoryRouter>
    );
    expect(
      screen.getByText('Mon super jeu (Edition Spéciale)')
    ).toBeInTheDocument();
  });

  it('gère une chaîne vide comme compteur invalide', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} title="Titre ()" />
      </MemoryRouter>
    );
    expect(screen.getByText('Titre ()')).toBeInTheDocument();
  });

  it('ne parse pas si le titre se termine par une parenthèse mais sans parenthèse ouvrante', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} title="Titre bizarre )" />
      </MemoryRouter>
    );

    expect(screen.getByText('Titre bizarre )')).toBeInTheDocument();
  });

  // --- Image Handling Tests ---
  it("transforme l'URL de l'image de t_thumb à t_cover_big", () => {
    const { container } = render(
      <MemoryRouter>
        <GameList
          games={[
            {
              id: 1,
              name: 'Thumb Game',
              image:
                'https://images.igdb.com/igdb/image/upload/t_thumb/co123.jpg',
            },
          ]}
        />
      </MemoryRouter>
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute(
      'src',
      'https://images.igdb.com/igdb/image/upload/t_cover_big/co123.jpg'
    );
  });

  it("utilise l'image par défaut si aucune URL n'est fournie", () => {
    const { container } = render(
      <MemoryRouter>
        <GameList games={[{ id: 1, name: 'No Image Game' }]} />
      </MemoryRouter>
    );
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/default-cover.jpg');
  });

  // --- UI Elements Tests ---
  it('formate correctement le statut', () => {
    render(
      <MemoryRouter>
        <GameList
          games={[{ id: 1, name: 'Zelda', status: 'EN_COURS' }]}
          showStatus={true}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('en cours')).toBeInTheDocument();
  });

  it('affiche le badge Steam avec le temps de jeu', () => {
    render(
      <MemoryRouter>
        <GameList
          games={[
            { id: 1, name: 'Portal', steam_appid: 400, playtime_forever: 15 },
          ]}
        />
      </MemoryRouter>
    );
    expect(screen.getByText('15h00')).toBeInTheDocument();
  });

  // --- Interaction Tests ---
  it('appelle onRemove quand on confirme la suppression', () => {
    const mockRemove = vi.fn();
    render(
      <MemoryRouter>
        <GameList
          games={[{ id: 1, name: 'Test', userGameId: 99 }]}
          onRemove={mockRemove}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Retirer le jeu'));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    expect(mockRemove).toHaveBeenCalledWith(99);
  });

  it('ferme la modale sans appeler onRemove si on annule', async () => {
    const mockRemove = vi.fn();
    render(
      <MemoryRouter>
        <GameList
          games={[{ id: 1, name: 'Test', userGameId: 99 }]}
          onRemove={mockRemove}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Retirer le jeu'));

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(mockRemove).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(
        screen.queryByText('Confirmer la suppression')
      ).not.toBeInTheDocument();
    });
  });

  it('ne fait rien si onConfirm est déclenché alors que pendingRemoveId est null (early return Ligne 237)', () => {
    const mockRemove = vi.fn();
    render(
      <MemoryRouter>
        <GameList
          games={[{ id: 1, name: 'Test', userGameId: 99 }]}
          onRemove={mockRemove}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Retirer le jeu'));

    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));

    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));

    expect(mockRemove).not.toHaveBeenCalled();
  });
});
