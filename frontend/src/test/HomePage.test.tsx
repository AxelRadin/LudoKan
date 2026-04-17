import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useHomeTrending } from '../hooks/useHomeTrending';
import { HomePage } from '../pages/HomePage';

vi.mock('../hooks/useHomeTrending', () => ({ useHomeTrending: vi.fn() }));
vi.mock('../components/Banner', () => ({
  default: () => <div data-testid="banner-mock" />,
}));

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

    expect(screen.getByTestId('banner-mock')).toBeInTheDocument();
    expect(screen.getByText('Jeux les plus récents ➜')).toBeInTheDocument();
  });
});
