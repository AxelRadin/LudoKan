import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MatchmakingModal from '../../components/MatchmakingModal';

// --- MOCKS ---
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../hooks/useMatchmakingTimer', () => ({
  useMatchmakingTimer: () => '00:42',
}));
vi.mock('../../hooks/usePartyChat', () => ({
  usePartyChat: () => ({
    messages: [{ id: 1, user_id: 1, content: 'Hello' }],
    sendMessage: vi.fn(),
    isConnected: true,
  }),
}));
vi.mock('../../contexts/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, pseudo: 'TestUser' } }),
}));

describe('MatchmakingModal', () => {
  const mockCancel = vi.fn();
  const mockClose = vi.fn();
  const mockActions = {
    markStartEarly: vi.fn(),
    markReady: vi.fn(),
    markReadyForChat: vi.fn(),
    leave: vi.fn(),
  };

  const defaultProps = {
    open: true,
    onClose: mockClose,
    onCancel: mockCancel,
    startedAt: new Date(),
    game: { id: '1', name: 'Super Game', image: 'test.png' },
    party: null,
    partyActions: mockActions,
    currentRadius: 20,
    isExpanding: false,
  } as any;

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('affiche la phase Radar au début avec le rayon actuel', () => {
    render(<MatchmakingModal {...defaultProps} />);
    expect(screen.getByText('Super Game')).toBeInTheDocument();
    expect(screen.getByText('matchmakingModal.analyzing')).toBeInTheDocument();
    expect(screen.getByText('Rayon actuel : 20 km')).toBeInTheDocument();
  });

  it("affiche le message d'élargissement quand isExpanding est true", () => {
    render(
      <MatchmakingModal
        {...defaultProps}
        currentRadius={70}
        isExpanding={true}
      />
    );
    expect(
      screen.getByText('Élargissement de la zone de recherche (70 km)...')
    ).toBeInTheDocument();
  });

  it('affiche la recherche mondiale si le rayon est >= 10000', () => {
    render(<MatchmakingModal {...defaultProps} currentRadius={20000} />);
    expect(
      screen.getByText('Recherche mondiale activée...')
    ).toBeInTheDocument();
  });

  it('gère le vote "Lancer tout de suite" en phase OPEN', () => {
    const party = {
      status: 'open',
      max_players: 4,
      members: [
        {
          user_id: 1,
          pseudo: 'Moi',
          wants_to_start_early: false,
          left_at: null,
        },
      ],
    } as any;

    render(<MatchmakingModal {...defaultProps} party={party} />);

    const startBtn = screen.getByText('Lancer tout de suite');
    fireEvent.click(startBtn);
    expect(mockActions.markStartEarly).toHaveBeenCalledWith(true);
  });

  it("affiche le chat et gère le timer d'auto-fermeture", () => {
    const party = {
      status: 'chat_active',
      chat_room_id: 99,
      members: [{ user_id: 1, membership_status: 'active', left_at: null }],
    } as any;

    render(<MatchmakingModal {...defaultProps} party={party} />);

    expect(screen.getByText(/Il n'y a plus personne/)).toBeInTheDocument();

    for (let i = 0; i <= 31; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(mockCancel).toHaveBeenCalled();
  });

  it('appelle onCancel quand on clique sur Quitter', () => {
    render(<MatchmakingModal {...defaultProps} />);
    const quitBtn = screen.getByText(/Quitter/i);
    fireEvent.click(quitBtn);
    expect(mockCancel).toHaveBeenCalled();
  });

  it('appelle onClose quand on clique sur Réduire', () => {
    render(<MatchmakingModal {...defaultProps} />);
    const reduceBtn = screen.getByText(/Réduire/i);
    fireEvent.click(reduceBtn);
    expect(mockClose).toHaveBeenCalled();
  });
});
