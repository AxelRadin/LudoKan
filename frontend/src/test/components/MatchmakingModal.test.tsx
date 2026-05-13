import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
    messages: [],
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
  };

  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("affiche la phase Radar quand il n'y a pas de party", () => {
    render(<MatchmakingModal {...defaultProps} />);
    expect(screen.getByText('Super Game')).toBeInTheDocument();
    expect(screen.getByText('matchmakingModal.analyzing')).toBeInTheDocument();
  });

  it('affiche la phase Lobby (Formation) et le bouton Lancer', () => {
    const party = {
      status: 'open',
      max_players: 4,
      members: [
        {
          user_id: 2,
          pseudo: 'Joueur2',
          wants_to_start_early: false,
          left_at: null,
        },
      ],
    } as any;

    render(<MatchmakingModal {...defaultProps} party={party} />);
    expect(screen.getByText('Formation du groupe...')).toBeInTheDocument();

    const startBtn = screen.getByText('Lancer tout de suite');
    fireEvent.click(startBtn);
    expect(mockActions.markStartEarly).toHaveBeenCalledWith(true);
  });

  it('affiche la phase Lobby (Préparation) et le bouton Prêt', () => {
    const party = {
      status: 'waiting_ready',
      max_players: 4,
      members: [{ user_id: 2, ready_state: 'pending', left_at: null }],
    } as any;

    render(<MatchmakingModal {...defaultProps} party={party} />);
    expect(screen.getByText('Préparation de la partie')).toBeInTheDocument();

    const readyBtn = screen.getByText('Je suis prêt');
    fireEvent.click(readyBtn);
    expect(mockActions.markReady).toHaveBeenCalledWith(true);
  });

  it('affiche la phase Chat quand le statut est chat_active', () => {
    const party = {
      status: 'chat_active',
      chat_room_id: 123,
      members: [{ user_id: 1, membership_status: 'active', left_at: null }],
    } as any;

    render(<MatchmakingModal {...defaultProps} party={party} />);
    expect(
      screen.getByText('Le chat est ouvert ! Dites bonjour.')
    ).toBeInTheDocument();
  });

  it('appelle onCancel quand on clique sur Quitter', () => {
    render(<MatchmakingModal {...defaultProps} />);
    const quitBtn = screen.getByText('Quitter la recherche / le groupe');
    fireEvent.click(quitBtn);
    expect(mockCancel).toHaveBeenCalled();
  });
});
