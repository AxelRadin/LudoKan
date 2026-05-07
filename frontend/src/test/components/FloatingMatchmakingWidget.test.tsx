import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FloatingMatchmakingWidget from '../../components/FloatingMatchmakingWidget';
import { useMatchmakingTimer } from '../../hooks/useMatchmakingTimer';

vi.mock('../../hooks/useMatchmakingTimer', () => ({
  useMatchmakingTimer: vi.fn(),
}));

describe('FloatingMatchmakingWidget', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("ne s'affiche pas (retourne null) si startedAt est absent", () => {
    const { container } = render(
      <FloatingMatchmakingWidget
        startedAt={null}
        hasNewMatch={false}
        onClick={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('affiche "Recherche en cours..." quand hasNewMatch est false', () => {
    vi.mocked(useMatchmakingTimer).mockReturnValue('00:10');

    render(
      <FloatingMatchmakingWidget
        startedAt={new Date()}
        hasNewMatch={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Recherche en cours...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('00:10')).toBeInTheDocument();
  });

  it('affiche "Joueur trouvé !" quand hasNewMatch est true', () => {
    vi.mocked(useMatchmakingTimer).mockReturnValue('01:20');

    render(
      <FloatingMatchmakingWidget
        startedAt={new Date()}
        hasNewMatch={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Joueur trouvé !')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('01:20')).toBeInTheDocument();
  });

  it('appelle onClick quand on clique sur le widget', () => {
    const handleClick = vi.fn();
    vi.mocked(useMatchmakingTimer).mockReturnValue('00:30');

    render(
      <FloatingMatchmakingWidget
        startedAt={new Date()}
        hasNewMatch={false}
        onClick={handleClick}
      />
    );

    const widgetText = screen.getByText('Recherche en cours...');
    fireEvent.click(widgetText);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
