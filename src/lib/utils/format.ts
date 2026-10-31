const NARROW_NBSP = " ";

/** 1250 → "1 250" (§15: números con formato local). */
export function formatNumber(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NARROW_NBSP);
}

/** 6400 ms → "0:07". Redondea hacia arriba para que "0:00" signifique tiempo agotado. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** 12 300 ms → "12 s". */
export function formatDuration(ms: number): string {
  return `${Math.max(0, Math.round(ms / 1000))} s`;
}
