import { useCallback, useEffect, useState } from 'react';

/**
 * Like useState, but persisted to sessionStorage under `key` — survives a
 * refresh of the same tab (not a new tab/window, and not closing the tab).
 * SSR-safe: the first render always returns initialValue and isHydrated:
 * false, then an effect reads sessionStorage after mount (so server and
 * client markup match — same reasoning as useWindowSize).
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(key);

      if (stored !== null) {
        setValue(JSON.parse(stored));
      }
    } catch {
      // Private browsing / storage disabled / corrupt JSON — fall back to
      // initialValue, same as if nothing had ever been saved.
    }

    setIsHydrated(true);
    // Only ever read from storage once, on mount — this hook owns the value
    // from then on rather than re-syncing from storage on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setStoredValue = useCallback(
    (next: T) => {
      setValue(next);

      try {
        window.sessionStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Storage may be full/disabled — in-memory state still updates, it
        // just won't survive a refresh.
      }
    },
    [key],
  );

  return [value, setStoredValue, isHydrated];
}
