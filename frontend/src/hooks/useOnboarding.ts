import { useCallback, useState } from 'react';

export const TOUR_KEYS = {
  home: 'tour_home_done',
  profile: 'tour_profile_done',
  game: 'tour_game_done',
  friends: 'tour_friends_done',
} as const;

export interface UseOnboardingResult {
  shouldShow: boolean;
  markAsDone: () => void;
  reset: () => void;
}

export function useOnboarding(storageKey: string): UseOnboardingResult {
  const [shouldShow] = useState(
    () => localStorage.getItem(storageKey) !== 'true'
  );

  const markAsDone = useCallback(() => {
    localStorage.setItem(storageKey, 'true');
  }, [storageKey]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { shouldShow, markAsDone, reset };
}
