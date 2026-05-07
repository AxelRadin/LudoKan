import { driver } from 'driver.js';
import { useCallback, useRef } from 'react';
import { TOUR_STEPS } from './tourSteps';

export interface UseTourOptions {
  onDone: () => void;
}

export function useTour({ onDone }: UseTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const startTour = useCallback(() => {
    driverRef.current = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Suivant →',
      prevBtnText: '← Précédent',
      doneBtnText: 'Commencer !',
      steps: TOUR_STEPS,
      onDestroyed: () => {
        onDone();
      },
    });

    driverRef.current.drive();
  }, [onDone]);

  return { startTour };
}
