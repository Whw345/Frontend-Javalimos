/** Configuración pública leída de variables NEXT_PUBLIC_* (ver .env.example). */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Mientras no exista backend, los mocks están activos salvo que se desactiven explícitamente. */
export const API_MOCKING_ENABLED = process.env.NEXT_PUBLIC_API_MOCKING === "enabled";

/** §13: bloqueo por cambio de pestaña. Preparado pero apagado en v1. */
export const ENABLE_TAB_GUARD = process.env.NEXT_PUBLIC_ENABLE_TAB_GUARD === "true";

/** Curso al que lleva la raíz mientras no exista /inicio. */
export const DEFAULT_COURSE_ID = process.env.NEXT_PUBLIC_DEFAULT_COURSE_ID ?? "bio-101";

export const WEEKLY_CHALLENGE_LIMIT = 10;
export const POINTS_CORRECT = 10;
export const POINTS_CORRECT_WITH_HINT = 5;
