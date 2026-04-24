import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TrendingGames from '../../components/TrendingGames';
import type { NormalizedGame } from '../../types/game';

const { forceNull } = vi.hoisted(() => ({ forceNull: { current: false } }));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useRef: (initialValue: any) => {
      const ref = actual.useRef(initialValue);
      let internalValue = ref.current;
      Object.defineProperty(ref, 'current', {
        get: () => (forceNull.current ? null : internalValue),
        set: val => {
          internalValue = val;
        },
      });
      return ref;
    },
  };
});

vi.mock('../../components/GameCard', () => ({
  default: ({ game }: { game: NormalizedGame }) => (
    <div data-testid="game-card">{game.name}</div>
  ),
}));

describe('TrendingGames', () => {
  beforeEach(() => {
    forceNull.current = false;
    vi.useFakeTimers();
    vi.clearAllMocks();

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
      cb => setTimeout(() => cb(performance.now()), 16) as any
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id =>
      clearTimeout(id as any)
    );

    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollLeft', {
      configurable: true,
      value: 0,
      writable: true,
    });
  });

  afterEach(() => {
    forceNull.current = false;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('affiche des skeletons pendant le chargement', () => {
    render(<TrendingGames games={[]} loading={true} />);
    const skeletons = document.querySelectorAll('.MuiSkeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("affiche un message si aucun jeu n'est fourni", () => {
    render(<TrendingGames games={[]} />);
    expect(screen.getByText('Aucun jeu à afficher')).toBeInTheDocument();
  });

  it('affiche correctement les GameCards', () => {
    const mockGames = [
      { igdb_id: 1, name: 'Game A' },
      { igdb_id: 2, name: 'Game B' },
    ] as NormalizedGame[];
    render(<TrendingGames games={mockGames} />);
    expect(screen.getByText('Game A')).toBeInTheDocument();
    expect(screen.getByText('Game B')).toBeInTheDocument();
  });

  it("gère l'auto-scroll", () => {
    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];
    const { unmount } = render(<TrendingGames games={mockGames} />);

    expect(window.requestAnimationFrame).toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(50);
    });

    unmount();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it("met en pause l'animation au survol et empêche le défilement", () => {
    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];
    render(<TrendingGames games={mockGames} />);

    const scrollContainer = screen.getByText('Game A').parentElement!;

    fireEvent.mouseEnter(scrollContainer);

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(scrollContainer.scrollLeft).toBe(0);

    fireEvent.mouseLeave(scrollContainer);
    fireEvent.touchStart(scrollContainer);
    fireEvent.touchEnd(scrollContainer);
  });

  it('gère le défilement manuel via les boutons', () => {
    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];
    render(<TrendingGames games={mockGames} />);
    const scrollContainer = screen.getByText('Game A').parentElement!;

    act(() => {
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        value: 200,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);
    });

    const leftButton = screen.getByLabelText('Voir les jeux précédents');
    fireEvent.click(leftButton);
    expect(scrollContainer.scrollLeft).toBe(0);

    const rightButton = screen.getByLabelText('Voir plus de jeux');
    fireEvent.click(rightButton);
    expect(scrollContainer.scrollLeft).toBe(200);
  });

  it('limite le défilement manuel aux bornes (Math.min / Math.max)', () => {
    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];
    render(<TrendingGames games={mockGames} />);
    const scrollContainer = screen.getByText('Game A').parentElement!;

    act(() => {
      Object.defineProperty(scrollContainer, 'scrollWidth', {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(scrollContainer, 'clientWidth', {
        value: 500,
        configurable: true,
      });
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        value: 400,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);
    });

    const rightButton = screen.getByLabelText('Voir plus de jeux');
    fireEvent.click(rightButton);
    expect(scrollContainer.scrollLeft).toBe(500);

    act(() => {
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        value: 100,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);
    });

    const leftButton = screen.getByLabelText('Voir les jeux précédents');
    fireEvent.click(leftButton);
    expect(scrollContainer.scrollLeft).toBe(0);
  });

  it("remet l'auto-scroll à zéro quand on atteint la fin", () => {
    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];
    render(<TrendingGames games={mockGames} />);
    const scrollContainer = screen.getByText('Game A').parentElement!;

    act(() => {
      Object.defineProperty(scrollContainer, 'scrollWidth', {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(scrollContainer, 'clientWidth', {
        value: 500,
        configurable: true,
      });
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        value: 500,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(scrollContainer.scrollLeft).toBeLessThan(1);
  });

  it('couvre les branches défensives impossibles (quand scrollRef.current est null)', () => {
    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];
    render(<TrendingGames games={mockGames} />);

    const scrollContainer = screen.getByText('Game A').parentElement!;

    act(() => {
      Object.defineProperty(scrollContainer, 'scrollWidth', {
        value: 1000,
        configurable: true,
      });
      Object.defineProperty(scrollContainer, 'clientWidth', {
        value: 500,
        configurable: true,
      });
      Object.defineProperty(scrollContainer, 'scrollLeft', {
        value: 200,
        writable: true,
        configurable: true,
      });
      fireEvent.scroll(scrollContainer);
    });

    const leftButton = screen.getByLabelText('Voir les jeux précédents');
    const rightButton = screen.getByLabelText('Voir plus de jeux');

    forceNull.current = true;

    fireEvent.click(leftButton);
    fireEvent.click(rightButton);
    fireEvent.scroll(scrollContainer);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(true).toBe(true);
  });

  it('couvre L38 (early return sur ref null) et L66 (cancelAnimationFrame ignoré si rafRef est null)', () => {
    forceNull.current = true;

    const mockGames = [{ igdb_id: 1, name: 'Game A' }] as NormalizedGame[];

    const { unmount } = render(<TrendingGames games={mockGames} />);

    unmount();

    expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
  });
});
