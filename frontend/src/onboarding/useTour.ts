import { driver } from 'driver.js';
import { useCallback, useRef } from 'react';
import { TOUR_STEPS } from './tourSteps';

// 0 = search, 1 = genres : informatifs uniquement, pas de clic requis
// 4 = matchmaking : élément absent si aucune recherche active
const OPTIONAL_STEPS = new Set([0, 1, 4]);

export interface UseTourOptions {
  onDone: () => void;
}

export function useTour({ onDone }: UseTourOptions) {
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
      steps: TOUR_STEPS,

      onHighlightStarted: element => {
        clickedRef.current = false;
        cleanupRef.current?.();
        cleanupRef.current = null;

        if (!element) return;
        const handler = () => {
          clickedRef.current = true;
          // profile step: auto-advance so the dropdown doesn't open under the overlay
          if ((driverRef.current?.getActiveIndex() ?? -1) === 3) {
            setTimeout(() => driverRef.current?.moveNext(), 250);
          }
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

        if (!OPTIONAL_STEPS.has(activeIndex) && !clickedRef.current) {
          const el = driverRef.current?.getActiveElement();
          if (el) {
            el.classList.remove('tour-must-click');
            void (el as HTMLElement).offsetWidth; // force reflow pour relancer l'animation
            el.classList.add('tour-must-click');
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
  }, [onDone]);

  return { startTour };
}
