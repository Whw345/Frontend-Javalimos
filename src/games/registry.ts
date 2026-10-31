import { cualMayor } from "./cual-mayor";
import { desliza } from "./desliza";
import { dosCajas } from "./dos-cajas";
import { encuentraError } from "./encuentra-error";
import { explicalo } from "./explicalo";
import { hueco } from "./hueco";
import { intruso } from "./intruso";
import { ordena } from "./ordena";
import { parejas } from "./parejas";
import { quienSoy } from "./quien-soy";
import type { GameDefinition, GameSlug } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- única excepción permitida (§16.3)
export type AnyGameDefinition = GameDefinition<any, any, any>;

/** Catálogo central (§11.3). `Record` completo: el compilador exige los 10 juegos. */
export const gameRegistry = {
  desliza,
  parejas,
  ordena,
  "dos-cajas": dosCajas,
  hueco,
  "encuentra-error": encuentraError,
  "quien-soy": quienSoy,
  intruso,
  "cual-mayor": cualMayor,
  explicalo,
} satisfies Record<GameSlug, AnyGameDefinition>;

export function getGameDefinition(slug: GameSlug): AnyGameDefinition | undefined {
  return (gameRegistry as Partial<Record<GameSlug, AnyGameDefinition>>)[slug];
}

/** En el orden de la tabla de plantillas (1–10). */
export const availableGames: AnyGameDefinition[] = Object.values(gameRegistry);
