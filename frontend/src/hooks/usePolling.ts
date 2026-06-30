import { useEffect, useRef, useCallback } from 'react';

interface PollingOptions {
  interval?: number;   // ms between polls, default 15000
  enabled?: boolean;   // pause polling when false
}

/**
 * Calls `fn` immediately and then every `interval` ms.
 * On failure it backs off exponentially (up to 4x interval) then retries.
 * The effect restarts cleanly when `fn` or `enabled` changes.
 */
export function usePolling(fn: () => Promise<void>, { interval = 15_000, enabled = true }: PollingOptions = {}) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const backoffRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback((delay: number) => {
    timerRef.current = setTimeout(async () => {
      try {
        await fnRef.current();
        backoffRef.current = 1;
      } catch {
        backoffRef.current = Math.min(backoffRef.current * 2, 4);
      }
      schedule(interval * backoffRef.current);
    }, delay);
  }, [interval]);

  useEffect(() => {
    if (!enabled) return;
    backoffRef.current = 1;

    // Fire immediately, then schedule
    (async () => {
      try { await fnRef.current(); } catch { backoffRef.current = 2; }
      schedule(interval * backoffRef.current);
    })();

    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [enabled, interval, schedule]);
}
