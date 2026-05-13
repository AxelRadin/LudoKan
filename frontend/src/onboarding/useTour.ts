import { driver } from 'driver.js';
import { useCallback, useRef } from 'react';
import type { DriveStep } from 'driver.js';

export interface UseTourOptions {
  steps: DriveStep[];
  optionalSteps: Set<number>;
  onDone: () => void;
}

export function useTour({ steps, optionalSteps, onDone }: UseTourOptions) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);
  const clickedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const startTour = useCallback(() => {
    driverRef.current = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      nextBtnText: 'Suivant →',
      prevBtnText: '← Précédent',
      doneBtnText: 'Commencer !',
      smoothScroll: true,
      steps,

      onHighlightStarted: element => {
        clickedRef.current = false;
        cleanupRef.current?.();
        cleanupRef.current = null;

        if (!element) return;
        const handler = () => {
          clickedRef.current = true;
        };
        element.addEventListener('click', handler);
        cleanupRef.current = () =>
          element.removeEventListener('click', handler);
      },

      onDeselected: () => {
        cleanupRef.current?.();
        cleanupRef.current = null;
      },

      onNextClick: () => {
        const activeIndex = driverRef.current?.getActiveIndex() ?? 0;

        if (!optionalSteps.has(activeIndex) && !clickedRef.current) {
          const el = driverRef.current?.getActiveElement();
          if (el) {
            el.classList.remove('tour-must-click');
            const forceReflow = (el as HTMLElement).offsetWidth;
            if (forceReflow >= 0) {
              el.classList.add('tour-must-click');
            }
            setTimeout(() => el.classList.remove('tour-must-click'), 600);
          }
          return;
        }

        driverRef.current?.moveNext();
      },

      onDestroyed: () => {
        cleanupRef.current?.();
        onDone();
      },
    });

    driverRef.current.drive();
  }, [steps, optionalSteps, onDone]);

  return { startTour };
}
