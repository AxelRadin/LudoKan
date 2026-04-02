import { useEffect, useState } from 'react';

export function useMatchmakingTimer(startedAt: Date | null): string {
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');

  useEffect(() => {
    if (!startedAt) {
      setElapsedTime('0:00');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const diffInSeconds = Math.floor(
        (now.getTime() - startedAt.getTime()) / 1000
      );

      if (diffInSeconds >= 0) {
        const minutes = Math.floor(diffInSeconds / 60);
        const seconds = diffInSeconds % 60;
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return elapsedTime;
}
