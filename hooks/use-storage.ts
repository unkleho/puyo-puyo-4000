import { useCallback, useEffect, useState } from 'react';

type StorageArea = 'local' | 'session';

function getStorage(area: StorageArea): Storage {
  return area === 'local' ? window.localStorage : window.sessionStorage;
}

/**
 * Like useState, but persisted to localStorage/sessionStorage under `key`.
 * SSR-safe: the first render always returns initialValue and isHydrated:
 * false, then an effect reads storage after mount (so server and client
 * markup match — same reasoning as useWindowSize). Shared by
 * useSessionStorage/useLocalStorage below rather than each keeping its own
 * copy of this.
 */
function useStorage<T>(
  area: StorageArea,
  key: string,
  initialValue: T,
): [T, (value: T) => void, boolean] {
  const [value, setValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = getStorage(area).getItem(key);

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
  }, [area, key]);

  const setStoredValue = useCallback(
    (next: T) => {
      setValue(next);

      try {
        getStorage(area).setItem(key, JSON.stringify(next));
      } catch {
        // Storage may be full/disabled — in-memory state still updates, it
        // just won't survive a refresh/reload.
      }
    },
    [area, key],
  );

  return [value, setStoredValue, isHydrated];
}

/** Survives a refresh of the same tab, not closing it (or a new tab/window). */
export function useSessionStorage<T>(key: string, initialValue: T) {
  return useStorage<T>('session', key, initialValue);
}

/** Survives closing the tab/browser entirely — same origin, any tab. */
export function useLocalStorage<T>(key: string, initialValue: T) {
  return useStorage<T>('local', key, initialValue);
}
