import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMatchmakingTimer } from '../hooks/useMatchmakingTimer';

describe('useMatchmakingTimer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('retourne "0:00" si startedAt est null', () => {
    const { result } = renderHook(() => useMatchmakingTimer(null));
    expect(result.current).toBe('0:00');
  });

  it('formate correctement le temps après 65 secondes', async () => {
    const startedAt = new Date();
    vi.setSystemTime(startedAt);

    const { result } = renderHook(() => useMatchmakingTimer(startedAt));

    await act(async () => {
      vi.advanceTimersByTime(65000);
    });

    expect(result.current).toBe('1:05');
  });
});
