import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GameList from '../components/GameList';

describe('GameList', () => {
  it('affiche un message quand la liste est vide', () => {
    render(
      <MemoryRouter>
        <GameList games={[]} />
      </MemoryRouter>
    );
    expect(screen.getByText('Aucun jeu à afficher.')).toBeInTheDocument();
  });

  it('appelle onRemove quand on clique sur la corbeille', () => {
    const mockRemove = vi.fn();
    render(
      <MemoryRouter>
        <GameList
          games={[{ id: 1, name: 'Test', userGameId: 99 } as any]}
          onRemove={mockRemove}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByLabelText('Retirer le jeu'));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer' }));
    expect(mockRemove).toHaveBeenCalledWith(99);
  });
});
