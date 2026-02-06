import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';
import FloatingMatchmakingWidget from '../components/FloatingMatchmakingWidget';

vi.mock('../hooks/useMatchmakingTimer', () => ({
  useMatchmakingTimer: vi.fn(),
}));

describe('FloatingMatchmakingWidget', () => {
  it('affiche le statut et réagit au clic', () => {
    const handleClick = vi.fn();
    vi.mocked(useMatchmakingTimer).mockReturnValue('00:45');

    render(
      <FloatingMatchmakingWidget
        startedAt={new Date()}
        hasNewMatch={true}
        onClick={handleClick}
      />
    );

    const widgetText = screen.getByText('Joueur trouvé !');
    expect(widgetText).toBeInTheDocument();

    fireEvent.click(widgetText);
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
