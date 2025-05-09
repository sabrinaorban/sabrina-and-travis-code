
import { useRef, useCallback } from 'react';

export const useGithubThrottling = (cooldownMs: number = 2000) => {
  const lastOperationTimeRef = useRef(0);
  const COOLDOWN_MS = cooldownMs;

  // Helper to check if we should throttle operations
  const shouldThrottle = useCallback(() => {
    const now = Date.now();
    return now - lastOperationTimeRef.current < COOLDOWN_MS;
  }, [COOLDOWN_MS]);

  // Update the last operation time
  const updateLastOperationTime = useCallback(() => {
    lastOperationTimeRef.current = Date.now();
  }, []);

  return {
    shouldThrottle,
    updateLastOperationTime,
    lastOperationTimeRef,
    COOLDOWN_MS
  };
};
