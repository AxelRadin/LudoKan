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

  it("ne s'affiche pas (retourne null) si startedAt et party sont absents", () => {
    const { container } = render(
      <FloatingMatchmakingWidget
        startedAt={null}
        hasNewMatch={false}
        onClick={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('affiche le chronomètre en phase de recherche (Radar)', () => {
    vi.mocked(useMatchmakingTimer).mockReturnValue('00:10');

    render(
      <FloatingMatchmakingWidget
        startedAt={new Date()}
        hasNewMatch={false}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('00:10')).toBeInTheDocument();
    expect(screen.getByTestId('RadarIcon')).toBeInTheDocument();
  });

  it('affiche le chronomètre quand hasNewMatch est true', () => {
    vi.mocked(useMatchmakingTimer).mockReturnValue('01:20');

    render(
      <FloatingMatchmakingWidget
        startedAt={new Date()}
        hasNewMatch={true}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('01:20')).toBeInTheDocument();
    expect(screen.getByTestId('RadarIcon')).toBeInTheDocument();
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

    const widgetText = screen.getByText('00:30');
    fireEvent.click(widgetText);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("affiche l'état Lobby correctement (formation du groupe)", () => {
    const mockParty = {
      status: 'open',
      max_players: 4,
      members: [{ left_at: null }, { left_at: null }],
    };

    render(
      <FloatingMatchmakingWidget
        startedAt={null}
        party={mockParty}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Lobby (2/4)')).toBeInTheDocument();
  });

  it("affiche l'état Chat correctement", () => {
    const mockParty = { status: 'chat_active' };

    render(
      <FloatingMatchmakingWidget
        startedAt={null}
        party={mockParty}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('Chat actif')).toBeInTheDocument();
  });
});
