/** Configuración pública leída de variables NEXT_PUBLIC_* (ver .env.example). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Mientras no exista backend, los mocks están activos salvo que se desactiven explícitamente. */
export const API_MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/** §13: bloqueo por cambio de pestaña. Preparado pero apagado en v1. */
export const ENABLE_TAB_GUARD = process.env.NEXT_PUBLIC_ENABLE_TAB_GUARD === "true";

/** El Debate puede adjuntar audio además del texto dictado. Desactivado por defecto. */
export const DEBATE_SEND_AUDIO = process.env.NEXT_PUBLIC_DEBATE_SEND_AUDIO === "true";

/** Curso al que lleva la raíz mientras no exista /inicio. */
export const DEFAULT_COURSE_ID = process.env.NEXT_PUBLIC_DEFAULT_COURSE_ID ?? "bio-101";

/** Vercel rechaza cuerpos de más de 4.5 MB antes de llegar a la función. */
export const MAX_PDF_MB = 4;
export const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;

export const WEEKLY_CHALLENGE_LIMIT = 10;
export const POINTS_CORRECT = 10;
export const POINTS_CORRECT_WITH_HINT = 5;
