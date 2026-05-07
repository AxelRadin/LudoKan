import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { AuthContext } from '../../contexts/AuthContextDef';
import { useAuth } from '../../contexts/useAuth';

describe('useAuth', () => {
  it('retourne correctement les valeurs du AuthContext', () => {
    const mockAuthValue = {
      user: { id: 1, username: 'Luigi' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AuthContext.Provider value={mockAuthValue as any}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toEqual(mockAuthValue);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.username).toBe('Luigi');
  });

  it('retourne les valeurs par défaut si utilisé hors du Provider', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current).toEqual(
      expect.objectContaining({
        isAuthenticated: false,
        user: null,
        isAuthLoading: true,
        isAuthModalOpen: false,
        authMode: 'login',
        pendingAction: null,
        setAuthModalOpen: expect.any(Function),
        setAuthMode: expect.any(Function),
        setAuthenticated: expect.any(Function),
        setPendingAction: expect.any(Function),
        setUser: expect.any(Function),
      })
    );
  });
});
