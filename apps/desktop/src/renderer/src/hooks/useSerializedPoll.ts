import { useEffect, useRef } from "react";

/** Runs an immediate, fixed-cadence poll without overlapping requests.
 *
 * The generation guard lets callers discard results belonging to an earlier
 * configuration or to an unmounted component. The request itself is not
 * cancelled because the preload IPC contract does not expose cancellation.
 */
export function useSerializedPoll(
  poll: (isCurrent: () => boolean) => Promise<void>,
  intervalMs: number,
  enabled = true,
): void {
  const inFlight = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const currentGeneration = ++generation.current;
    if (!enabled) return;

    let active = true;
    const isCurrent = () => active && generation.current === currentGeneration;
    const run = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await poll(isCurrent);
      } finally {
        inFlight.current = false;
      }
    };

    void run();
    const timer = window.setInterval(() => void run(), intervalMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs, poll]);
}
