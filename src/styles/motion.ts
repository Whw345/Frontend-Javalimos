/**
 * Espejo en JS de los tokens de movimiento de tokens.css (§7.1), para Motion.
 * Si cambias un valor aquí, cámbialo también en tokens.css.
 */
export const DURATION = {
  instant: 0.1,
  fast: 0.16,
  base: 0.24,
  slow: 0.4,
  celebrate: 0.8,
} as const;

export const EASE = {
  out: [0.22, 1, 0.36, 1],
  in: [0.64, 0, 0.78, 0],
  spring: [0.34, 1.56, 0.64, 1],
} as const;

/** Desfase entre elementos que aparecen en secuencia (estrellas del resultado). */
export const STAGGER = 0.12;
