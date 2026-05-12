import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useHomeTrending } from '../../hooks/useHomeTrending';
import { HomePage, SectionLabel } from '../../pages/HomePage';

// --- MOCKS ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/useHomeTrending', () => ({
  useHomeTrending: vi.fn(),
}));

vi.mock('../../components/GenreGrid', () => ({
  default: ({
    onGenreClick,
  }: {
    onGenreClick: (id: number, name: string) => void;
  }) => (
    <button
      data-testid="mock-genre-btn"
      onClick={() => onGenreClick(12, 'RPG')}
    >
      Cliquez pour simuler un genre
    </button>
  ),
}));

describe('HomePage', () => {
  let observerCallbacks: IntersectionObserverCallback[] = [];

  beforeEach(() => {
    vi.clearAllMocks();

    window.scrollTo = vi.fn();
    observerCallbacks = [];

    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("affiche les sections et gère l'animation au défilement (IntersectionObserver)", () => {
    vi.mocked(useHomeTrending).mockReturnValue({
      sections: {
        recent: {
          games: [{ id: 1, cover_url: 'http://img.com/cover.jpg' }],
          loading: false,
        },
        rating: { games: [], loading: false },
        popularity: { games: [], loading: false },
      } as any,
      genreSection: null,
    });

    const { unmount } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Découverte')).toBeInTheDocument();
    expect(screen.getByText('Excellence')).toBeInTheDocument();
    expect(screen.getByText('Tendances')).toBeInTheDocument();
    expect(screen.getByText('Explorer par genre')).toBeInTheDocument();

    act(() => {
      observerCallbacks.forEach(cb => {
        cb(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver
        );
      });
    });

    unmount();
  });

  it('navigue vers la page du genre et remonte en haut (scrollTo) au clic', () => {
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

    fireEvent.click(screen.getByTestId('mock-genre-btn'));

    expect(mockNavigate).toHaveBeenCalledWith('/trending/genre/12', {
      state: { genreName: 'RPG' },
    });
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  it('affiche correctement la page en mode sombre (Dark Mode)', () => {
    vi.mocked(useHomeTrending).mockReturnValue({
      sections: {
        recent: {
          games: [{ id: 1, cover_url: 'http://img.com/cover.jpg' }],
          loading: false,
        },
        rating: { games: [], loading: false },
        popularity: { games: [], loading: false },
      } as any,
      genreSection: null,
    });

    const darkTheme = createTheme({ palette: { mode: 'dark' } });

    render(
      <ThemeProvider theme={darkTheme}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>
    );

    act(() => {
      observerCallbacks.forEach(cb => {
        cb(
          [{ isIntersecting: true }] as IntersectionObserverEntry[],
          {} as IntersectionObserver
        );
      });
    });

    expect(screen.getByText('Découverte')).toBeInTheDocument();
  });

  it('SectionLabel s\'affiche correctement sans la prop "to" (Lignes 112-121)', () => {
    render(
      <MemoryRouter>
        <SectionLabel label="Test Label" title="Titre Sans Lien" />
      </MemoryRouter>
    );

    expect(screen.getByText('Titre Sans Lien')).toBeInTheDocument();
  });

  it("n'injecte pas les styles globaux (luxFadeUp) deux fois (Ligne 24)", async () => {
    document.head.innerHTML = '';

    const styleEl = document.createElement('style');
    styleEl.dataset.homeLux = '1';
    document.head.appendChild(styleEl);

    vi.resetModules();

    await import('../../pages/HomePage');

    const styles = document.head.querySelectorAll('style[data-home-lux="1"]');
    expect(styles.length).toBe(1);
  });
});
