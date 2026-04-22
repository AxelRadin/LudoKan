import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useHomeTrending } from '../hooks/useHomeTrending';
import { HomePage } from '../pages/HomePage';

vi.mock('../hooks/useHomeTrending', () => ({ useHomeTrending: vi.fn() }));

describe('HomePage', () => {
  it('affiche les différentes sections', () => {
    vi.mocked(useHomeTrending).mockReturnValue({
      sections: {
        recent: { games: [], loading: false },
        rating: { games: [], loading: false },
        popularity: { games: [], loading: false },
      } as any,
      genreSection: null,
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Découverte')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Jeux les plus récents' })
    ).toBeInTheDocument();
    expect(screen.getByText('Excellence')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Jeux les mieux notés' })
    ).toBeInTheDocument();
    expect(screen.getByText('Tendances')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Jeux les plus populaires' })
    ).toBeInTheDocument();
    expect(screen.getByText('Explorer par genre')).toBeInTheDocument();
  });
});
