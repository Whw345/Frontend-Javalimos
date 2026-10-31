import { catalogGames } from "@/lib/games/catalog";

/** Respuesta del modelo de decisión donde solo los juegos indicados son buenos. */
export function decisionAnswers(...suitable: string[]) {
  return {
    answers: Object.fromEntries(
      catalogGames.map(({ id }) => [id, { suitable: suitable.includes(id), reason: "Prueba." }]),
    ),
  };
}
