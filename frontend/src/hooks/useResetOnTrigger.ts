import { useEffect, useRef } from "react";

/**
 * Runs `reset` whenever `trigger` changes to a truthy value (open=true, or
 * a non-null entity prop appearing). Centralizes the "reset form when
 * dialog opens" / "seed form when entity arrives" pattern and owns the
 * `react-hooks/set-state-in-effect` suppression.
 *
 * `reset` is captured via ref so callers can write a fresh closure each
 * render without needing `useCallback` — the hook only re-runs on trigger
 * change, but always calls the latest closure.
 */
export function useResetOnTrigger(trigger: unknown, reset: () => void): void {
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });
  useEffect(() => {
    if (trigger == null || trigger === false) return;
    resetRef.current();
  }, [trigger]);
}
