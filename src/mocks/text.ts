/** Utilidades de texto de los evaluadores simulados (Explícalo y el mediador del Debate). */

const STOPWORDS = new Set([
  "para",
  "sobre",
  "entre",
  "desde",
  "hasta",
  "cada",
  "como",
  "durante",
  "final",
  "también",
]);

// Quita tildes (y la de la ñ): se aplica igual a la respuesta y a la referencia.
export const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export interface Idea {
  /** Forma normalizada, para comparar. */
  key: string;
  /** Palabra tal como aparece en el material, para mostrar. */
  label: string;
}

/** Ideas clave = palabras con contenido (5+ letras) del texto, sin las palabras de `exclude`. */
export function keywordsOf(text: string, exclude = ""): Idea[] {
  const excluded = new Set(normalize(exclude).split(/\s+/));
  const ideas = new Map<string, Idea>();
  for (const word of text.toLowerCase().match(/\p{L}{5,}/gu) ?? []) {
    const key = normalize(word);
    if (!STOPWORDS.has(key) && !excluded.has(key) && !ideas.has(key)) ideas.set(key, { key, label: word });
  }
  return [...ideas.values()];
}

/** Raíz de la palabra: acepta plurales y variaciones cortas ("célula" / "células"). */
export function mentions(normalizedText: string, key: string): boolean {
  return normalizedText.includes(key.slice(0, Math.max(5, key.length - 2)));
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
