import { useCallback, useState } from 'react';

const STORAGE_KEY = 'onboarding_done';

export interface UseOnboardingResult {
  shouldShow: boolean;
  markAsDone: () => void;
}

export function useOnboarding(): UseOnboardingResult {
  const [shouldShow] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'true'
  );

  const markAsDone = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  return { shouldShow, markAsDone };
}
