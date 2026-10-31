"use client";

import { useEffect, useState, type ReactNode } from "react";
import { API_MOCKING_ENABLED } from "@/lib/config";

/**
 * Arranca Mock Service Worker antes de renderizar la app, para que ninguna
 * petición salga antes de que los mocks estén listos. Sin mocks, no hace nada.
 */
export function MockServiceGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!API_MOCKING_ENABLED);

  useEffect(() => {
    if (!API_MOCKING_ENABLED) return;
    let cancelled = false;
    void import("./browser")
      .then(({ startMockWorker }) => startMockWorker())
      .then(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? children : null;
}
