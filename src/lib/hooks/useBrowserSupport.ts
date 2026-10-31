"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => undefined;
const serverSnapshot = () => false;

/** Si el navegador tiene una API (dictado, lectura en voz alta…). En el servidor siempre es false. */
export function useBrowserSupport(check: () => boolean): boolean {
  return useSyncExternalStore(subscribe, check, serverSnapshot);
}
