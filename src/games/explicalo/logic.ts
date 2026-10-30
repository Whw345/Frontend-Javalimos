import type { Difficulty } from "../types";

export const EXPLICALO_LEVELS: Record<Difficulty, { seconds: number; maxChars: number }> = {
  1: { seconds: 60, maxChars: 150 },
  2: { seconds: 50, maxChars: 120 },
  3: { seconds: 45, maxChars: 100 },
};

/** Recorta al máximo permitido (por si se pega texto más largo). */
export function clampText(text: string, maxChars: number): string {
  return text.slice(0, maxChars);
}

export function canSubmit(text: string): boolean {
  return text.trim().length > 0;
}

/** Ctrl+Enter (Windows/Linux) o ⌘+Enter (macOS) envía (§11.5). */
export function isSubmitShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean }): boolean {
  return event.key === "Enter" && (event.ctrlKey || event.metaKey);
}
