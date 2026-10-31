/** Perú no cambia de hora: las semanas del curso empiezan los lunes a las 00:00 en UTC−5. */
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "2026-11-02" tal como llega de una columna date, sea texto o Date. */
export function dateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** Fecha 0 del curso: el siguiente lunes en Lima, u hoy si ya es lunes. */
export function firstMonday(now: Date): string {
  const lima = new Date(now.getTime() - LIMA_OFFSET_MS);
  lima.setUTCDate(lima.getUTCDate() + ((8 - lima.getUTCDay()) % 7));
  return lima.toISOString().slice(0, 10);
}

/** La semana N abre el lunes a medianoche y vence al iniciar la semana N + 1. */
export function weekWindow(startsOn: string, weekNumber: number) {
  const opensAt = Date.parse(`${startsOn}T00:00:00-05:00`) + (weekNumber - 1) * WEEK_MS;
  return { opensAt: new Date(opensAt).toISOString(), deadline: new Date(opensAt + WEEK_MS).toISOString() };
}

/** Dificultad progresiva: el curso se reparte en tres tramos, de nivel 1 a nivel 3. */
export function difficultyForWeek(weekNumber: number, weekNumbers: number[]): 1 | 2 | 3 {
  const rank = [...weekNumbers].sort((a, b) => a - b).indexOf(weekNumber);
  return Math.min(3, Math.floor((Math.max(0, rank) * 3) / Math.max(1, weekNumbers.length)) + 1) as 1 | 2 | 3;
}

/** "lun 9 nov, 00:00" (§15), siempre en hora de Lima. */
export function formatDeadline(iso: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date(iso))
    .replace(/[.]/g, "")
    .replace(/^(\p{L}+),/u, "$1");
}
