import { useEffect, useRef, useCallback } from 'react';
import { useOSStore } from '@/store/os-store';
import { fetchHealth, fetchProviders } from '@/lib/engine';

/**
 * Polls the agent engine health + providers every 10s.
 * Updates global store with connectivity state.
 */
export function useEnginePoller() {
  const { engineUrl, setEngineConnected, setProviders } = useOSStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      await fetchHealth(engineUrl);
      setEngineConnected(true);
      const providers = await fetchProviders(engineUrl);
      setProviders(providers);
    } catch {
      setEngineConnected(false);
    }
  }, [engineUrl, setEngineConnected, setProviders]);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, 10_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [poll]);
}
