import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);
let started: Promise<unknown> | null = null;

/** Idempotente: Strict Mode monta los efectos dos veces y MSW no admite un segundo `start()`. */
export function startMockWorker(): Promise<unknown> {
  started ??= worker.start({ onUnhandledRequest: "bypass", quiet: true });
  return started;
}
