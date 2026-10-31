"use client";

import { useEffect, useRef, useState } from "react";

const TICK_MS = 100;

interface CountdownOptions {
  /** Desfase servidor − cliente en ms (§17: "Reloj"). */
  clockOffsetMs: number;
  paused: boolean;
  onExpire: () => void;
}

/**
 * Tiempo restante hasta `deadline` (ms en hora del servidor).
 * Llama a `onExpire` una sola vez por cada `deadline`.
 */
export function useCountdown(
  deadline: number,
  { clockOffsetMs, paused, onExpire }: CountdownOptions,
): number {
  const remainingAt = () => Math.max(0, deadline - (Date.now() + clockOffsetMs));
  const [remainingMs, setRemainingMs] = useState(remainingAt);
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (paused) return;
    let expired = false;

    const tick = () => {
      const next = Math.max(0, deadline - (Date.now() + clockOffsetMs));
      setRemainingMs(next);
      if (next === 0 && !expired) {
        expired = true;
        onExpireRef.current();
      }
    };

    tick();
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [deadline, clockOffsetMs, paused]);

  return remainingMs;
}
