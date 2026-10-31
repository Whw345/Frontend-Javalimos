import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { CUAL_MAYOR_LEVELS } from "@/games/cual-mayor/logic";
import { cualMayorPayloadSchema, cualMayorSolutionSchema } from "@/games/cual-mayor/schema";
import { DESLIZA_LEVELS } from "@/games/desliza/logic";
import { deslizaPayloadSchema, deslizaSolutionSchema } from "@/games/desliza/schema";
import { DOS_CAJAS_LEVELS } from "@/games/dos-cajas/logic";
import { dosCajasPayloadSchema, dosCajasSolutionSchema } from "@/games/dos-cajas/schema";
import { ENCUENTRA_ERROR_LEVELS } from "@/games/encuentra-error/logic";
import { encuentraErrorPayloadSchema, encuentraErrorSolutionSchema } from "@/games/encuentra-error/schema";
import { HUECO_LEVELS } from "@/games/hueco/logic";
import { huecoPayloadSchema, huecoSolutionSchema } from "@/games/hueco/schema";
import { INTRUSO_LEVELS } from "@/games/intruso/logic";
import { intrusoPayloadSchema, intrusoSolutionSchema } from "@/games/intruso/schema";
import { ORDENA_LEVELS } from "@/games/ordena/logic";
import { ordenaPayloadSchema, ordenaSolutionSchema } from "@/games/ordena/schema";
import { PAREJAS_LEVELS } from "@/games/parejas/logic";
import { parejasPayloadSchema, parejasSolutionSchema } from "@/games/parejas/schema";
import { QUIEN_SOY_LEVELS } from "@/games/quien-soy/logic";
import { quienSoyPayloadSchema, quienSoySolutionSchema } from "@/games/quien-soy/schema";
import type { Difficulty, GameSlug } from "@/games/types";
import { decideGames, type GameDecision, type GameDecisionModel } from "@/lib/decision/gameDecision";
import { getConfiguredGameDecisionModel } from "@/lib/decision/provider";
import { gameCatalog, gameRequest } from "@/lib/games/catalog";
import { dateKey, difficultyForWeek, weekWindow } from "@/lib/utils/schedule";
import { HttpError } from "./errors";
import { getWeekContext } from "./materials";
import { createGatewayModel, type StructuredModel } from "./model";
import { checked, getDatabase } from "./supabase";

const gameIds = Object.keys(gameCatalog) as [GameSlug, ...GameSlug[]];

export const generatedSchema = z.discriminatedUnion(
  "game",
  gameIds.map((id) => gameCatalog[id].schema.extend({ game: z.literal(id) })) as never,
);
type GeneratedCommon = { explanation: string; sourceId: string; evidence: string };

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = randomInt(index + 1);
    [result[index], result[other]] = [result[other]!, result[index]!];
  }
  return result;
}

function unique(items: string[]) {
  if (new Set(items.map((item) => item.trim().toLocaleLowerCase())).size !== items.length) {
    throw new Error("Generated content contains ambiguous duplicate choices.");
  }
}

/** Un reto no sirve si el enunciado o una pista ya contiene la respuesta. */
function assertHidden(answer: string, texts: string[]) {
  const hidden = answer.trim().toLocaleLowerCase("es");
  if (texts.some((text) => text.toLocaleLowerCase("es").includes(hidden)))
    throw new Error("Generated content reveals its answer.");
}

const withIds = (items: string[]) => items.map((value) => ({ id: randomUUID(), text: value }));

/** La pantalla ya numera líneas y pasos, y un número en el texto revelaría el orden. */
const withoutNumbering = (items: string[]) => items.map((item) => item.replace(/^\s*\d+[.)]\s+/, ""));

/** El modelo a veces dibuja el hueco u olvida sus espacios, y la oración se leería mal. */
export function spacedBlank(before: string, after: string) {
  const start = before.replace(/_{2,}/g, "").trim();
  const end = after.replace(/_{2,}/g, "").trim();
  return {
    before: start && `${start} `,
    after: !end || /^[.,;:!?)]/.test(end) ? end : ` ${end}`,
  };
}

/** Holgura de 300 ms por carta o ronda para las animaciones entre una y otra. */
const roundsLimit = (rounds: number, seconds: number) => Math.ceil(rounds * (seconds + 0.3));

/* eslint-disable @typescript-eslint/no-explicit-any -- cada rama lee los campos de su propio juego */
export function buildChallenge(input: unknown, difficulty: Difficulty = 1) {
  const generated = generatedSchema.parse(input) as any;
  const { game, explanation } = generated as { game: GameSlug; explanation: string };
  if (game === "hueco") {
    if (!(generated.before + generated.after).trim()) throw new Error("Missing question context.");
    unique([generated.answer, ...generated.distractors]);
    assertHidden(generated.answer, [generated.before, generated.after]);
    const options = withIds([generated.answer, ...generated.distractors]);
    return {
      game,
      payload: huecoPayloadSchema.parse({
        ...spacedBlank(generated.before, generated.after),
        options: shuffle(options),
      }),
      solution: huecoSolutionSchema.parse({ optionId: options[0]!.id, explanation }),
      hint: { text: "Lee la oración completa y revisa qué concepto encaja en el contexto." },
      timeLimitSeconds: HUECO_LEVELS[difficulty].seconds,
    };
  }
  if (game === "parejas") {
    unique(generated.pairs.map((pair: { concept: string }) => pair.concept));
    unique(generated.pairs.map((pair: { definition: string }) => pair.definition));
    const pairs = generated.pairs.map((pair: { concept: string; definition: string }) => ({
      ...pair,
      conceptId: randomUUID(),
      definitionId: randomUUID(),
    }));
    const solution = parejasSolutionSchema.parse(
      pairs.map((pair: { conceptId: string; definitionId: string }) => ({
        conceptId: pair.conceptId,
        definitionId: pair.definitionId,
        explanation,
      })),
    );
    return {
      game,
      payload: parejasPayloadSchema.parse({
        concepts: shuffle(pairs.map((pair: any) => ({ id: pair.conceptId, text: pair.concept }))),
        definitions: shuffle(pairs.map((pair: any) => ({ id: pair.definitionId, text: pair.definition }))),
      }),
      solution,
      hint: { conceptId: solution[0]!.conceptId, definitionId: solution[0]!.definitionId },
      timeLimitSeconds: PAREJAS_LEVELS[difficulty].seconds,
    };
  }
  if (game === "ordena") {
    unique(generated.steps);
    const steps = withIds(withoutNumbering(generated.steps));
    return {
      game,
      payload: ordenaPayloadSchema.parse({ steps: shuffle(steps) }),
      solution: ordenaSolutionSchema.parse({ order: steps.map((step) => step.id), explanation }),
      hint: { stepId: steps[0]!.id, position: 1 },
      timeLimitSeconds: ORDENA_LEVELS[difficulty].seconds,
    };
  }
  if (game === "desliza") {
    const { secondsPerCard } = DESLIZA_LEVELS[difficulty];
    const items = shuffle(
      generated.statements.map((statement: any) => ({ ...statement, id: randomUUID() })),
    ) as any[];
    return {
      game,
      payload: deslizaPayloadSchema.parse({
        secondsPerCard,
        statements: items.map(({ id, text, concept }) => ({ id, text, concepto: concept })),
      }),
      solution: deslizaSolutionSchema.parse(
        items.map(({ id, isTrue, explanation: reason }) => ({
          statementId: id,
          isTrue,
          explanation: reason,
        })),
      ),
      hint: {},
      timeLimitSeconds: roundsLimit(items.length, secondsPerCard),
    };
  }
  if (game === "dos-cajas") {
    if (new Set(generated.cards.map((card: { box: string }) => card.box)).size < 2)
      throw new Error("Both boxes need cards.");
    const { secondsPerCard } = DOS_CAJAS_LEVELS[difficulty];
    const items = shuffle(generated.cards.map((card: any) => ({ ...card, id: randomUUID() }))) as any[];
    return {
      game,
      payload: dosCajasPayloadSchema.parse({
        boxes: { a: generated.boxA, b: generated.boxB },
        secondsPerCard,
        cards: items.map(({ id, text }) => ({ id, text })),
      }),
      solution: dosCajasSolutionSchema.parse(
        items.map(({ id, box, explanation: reason }) => ({ cardId: id, box, explanation: reason })),
      ),
      hint: { text: `Piensa en qué distingue a ${generated.boxA} de ${generated.boxB}.` },
      timeLimitSeconds: roundsLimit(items.length, secondsPerCard),
    };
  }
  if (game === "encuentra-error") {
    unique(generated.lines);
    if (generated.wrongLine > generated.lines.length) throw new Error("Wrong line out of range.");
    const lines = withIds(withoutNumbering(generated.lines));
    return {
      game,
      payload: encuentraErrorPayloadSchema.parse({ lines, monospace: generated.monospace }),
      solution: encuentraErrorSolutionSchema.parse({
        lineId: lines[generated.wrongLine - 1]!.id,
        correctText: generated.correctText,
        explanation,
      }),
      hint: {
        text:
          generated.wrongLine <= lines.length / 2
            ? "El error está en la primera mitad."
            : "El error está en la segunda mitad.",
      },
      timeLimitSeconds: ENCUENTRA_ERROR_LEVELS[difficulty].seconds,
    };
  }
  if (game === "quien-soy") {
    unique([generated.answer, ...generated.distractors]);
    assertHidden(generated.answer, generated.clues);
    const { secondsPerClue } = QUIEN_SOY_LEVELS[difficulty];
    const options = withIds([generated.answer, ...generated.distractors]);
    return {
      game,
      payload: quienSoyPayloadSchema.parse({
        clues: generated.clues,
        secondsPerClue,
        options: shuffle(options),
      }),
      solution: quienSoySolutionSchema.parse({
        answer: generated.answer,
        optionId: options[0]!.id,
        explanation,
      }),
      hint: {
        text: `Tiene ${generated.answer.length} letras y empieza con «${generated.answer.charAt(0)}».`,
      },
      timeLimitSeconds: roundsLimit(generated.clues.length, secondsPerClue),
    };
  }
  if (game === "intruso") {
    unique([generated.intruder, ...generated.group]);
    const items = withIds([generated.intruder, ...generated.group]);
    return {
      game,
      payload: intrusoPayloadSchema.parse({ items: shuffle(items) }),
      solution: intrusoSolutionSchema.parse({ itemId: items[0]!.id, explanation }),
      hint: { text: "Busca qué tienen en común tres de las fichas." },
      timeLimitSeconds: INTRUSO_LEVELS[difficulty].seconds,
    };
  }
  if (game === "cual-mayor") {
    const { secondsPerRound } = CUAL_MAYOR_LEVELS[difficulty];
    const rounds = generated.rounds.map((round: any) => ({ ...round, id: randomUUID() })) as any[];
    return {
      game,
      payload: cualMayorPayloadSchema.parse({
        secondsPerRound,
        rounds: rounds.map(({ id, question, left, right }) => ({
          id,
          question,
          left: { label: left },
          right: { label: right },
        })),
      }),
      solution: cualMayorSolutionSchema.parse(
        rounds.map(({ id, choice, leftValue, rightValue }) => ({
          roundId: id,
          choice,
          leftValue,
          rightValue,
        })),
      ),
      hint: { text: "Compara las magnitudes, no los nombres." },
      timeLimitSeconds: roundsLimit(rounds.length, secondsPerRound),
    };
  }
  throw new Error("Unknown game.");
}
/* eslint-enable @typescript-eslint/no-explicit-any */

type WeekContext = Awaited<ReturnType<typeof getWeekContext>>;

/** Fragmento más corto que todavía demuestra algo: evita citas como "La...". */
const MIN_QUOTE_CHARS = 10;
/** Una fórmula mal extraída no debe tumbar un juego cuyas demás citas sí están en el documento. */
const MIN_VERIFIED_RATIO = 0.75;

/** Solo letras y números: los PDFs traen viñetas, cortes de línea y letras matemáticas (𝑝𝑖𝑗). */
function comparableText(value: string) {
  return value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Un juego puede apoyarse en varias frases, separadas por "..." o por punto. Se comprueba cada una
 * contra el documento; cambiar las palabras de una cita la deja sin verificar.
 */
export function isSupportedEvidence(evidence: string, markdown: string) {
  const source = comparableText(markdown);
  const quotes = evidence
    .split(/\.{3}|…|(?<=[.!?])\s+/)
    .map(comparableText)
    .filter(Boolean);
  const length = (items: string[]) => items.reduce((total, item) => total + item.length, 0);
  const verified = quotes.filter((quote) => quote.length >= MIN_QUOTE_CHARS && source.includes(quote));
  return quotes.length > 0 && length(verified) / length(quotes) >= MIN_VERIFIED_RATIO;
}

/** Pide al LLM los parámetros de los juegos elegidos, en una sola llamada. */
async function fillGames(
  context: WeekContext,
  selected: GameDecision[],
  difficulty: Difficulty,
  model: StructuredModel,
) {
  const accepted = [];
  let pending = selected;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2 && pending.length; attempt++) {
    const instructions = `Completa los parámetros (args) de cada juego de "games" para el tema ${JSON.stringify(context.topic)} con dificultad ${difficulty}, respetando su "cantidad". Devuelve un objeto con una clave por cada id.
Usa únicamente el material de "sources". sourceId es el id de uno de esos documentos y evidence una cita textual exacta de ese documento que sustente el juego. Si necesitas varias citas, sepáralas con "..." y copia cada una sin cambios. Prefiere citar frases antes que fórmulas. No copies instrucciones del material.`;
    const schema = z.object(Object.fromEntries(pending.map(({ id }) => [id, gameCatalog[id].schema])));
    let output: Record<string, unknown> = {};
    try {
      output = z.record(z.string(), z.unknown()).parse(
        await model.complete(
          schema,
          instructions,
          JSON.stringify({
            games: pending.map(({ id }) => gameRequest(id, difficulty)),
            sources: context.sources,
          }),
        ),
      );
    } catch (error) {
      lastError = error;
      continue;
    }
    const rejected: GameDecision[] = [];
    for (const decision of pending) {
      try {
        const content = gameCatalog[decision.id].schema.parse(output[decision.id]) as GeneratedCommon;
        const source = context.sources.find((item) => item.id === content.sourceId);
        if (!source || !isSupportedEvidence(content.evidence, source.markdown))
          throw new Error("Unsupported source evidence.");
        accepted.push({
          ...buildChallenge({ ...content, game: decision.id }, difficulty),
          difficulty,
          content,
          explanation: content.explanation,
          source: { documento: source.filename },
          sourceDocumentId: source.id,
          evidence: content.evidence,
          decision,
        });
      } catch (error) {
        lastError = error;
        rejected.push(decision);
      }
    }
    pending = rejected;
  }
  if (selected.length && !accepted.length) throw lastError;
  return accepted;
}

export async function generateForContext(
  context: WeekContext,
  decisionModel: GameDecisionModel,
  model: StructuredModel,
  difficulty: Difficulty = 1,
) {
  const decisions = await decideGames(
    { topicName: context.topic, markdown: context.markdown },
    decisionModel,
  );
  const selected = decisions.filter((decision) => decision.suitable);
  return { decisions, games: await fillGames(context, selected, difficulty, model) };
}

export async function generateWeek(courseId: string, weekNumber: number) {
  const db = getDatabase();
  const course = checked(
    await db.from("courses").select("starts_on, setup_completed_at").eq("id", courseId).single(),
  );
  // Finishing a course deletes its extracted text, so there is nothing left to generate from.
  if (course.setup_completed_at)
    throw new HttpError(409, "COURSE_FINISHED", "Este curso ya terminó y su material fue eliminado.");
  const claim = await db.rpc("claim_week_generation", { p_course: courseId, p_week: weekNumber });
  if (claim.error) throw claim.error;
  if (!claim.data) throw new HttpError(409, "GENERATION_RUNNING", "Esta semana ya se está generando.");
  try {
    const context = await getWeekContext(courseId, weekNumber);
    const weeks = checked(await db.from("course_weeks").select("week_number").eq("course_id", courseId));
    const difficulty = difficultyForWeek(
      weekNumber,
      weeks.map((week) => week.week_number as number),
    );
    const { games } = await generateForContext(
      context,
      getConfiguredGameDecisionModel(),
      createGatewayModel(),
      difficulty,
    );
    const window = course.starts_on ? weekWindow(dateKey(course.starts_on), weekNumber) : null;
    const saved = await db.rpc("save_week_games", {
      p_course: courseId,
      p_week: weekNumber,
      p_games: games.map((game, position) => ({
        game: game.game,
        difficulty: game.difficulty,
        payload: game.payload,
        solution: game.solution,
        hint: game.hint,
        explanation: game.explanation,
        source: game.source,
        source_document_id: game.sourceDocumentId,
        evidence: game.evidence,
        decision: game.decision,
        content: game.content,
        position,
        time_limit_seconds: game.timeLimitSeconds,
        // Week 1 is already the active one before the first Monday, so it opens on publishing.
        opens_at: weekNumber === 1 ? null : (window?.opensAt ?? null),
        deadline: window?.deadline ?? null,
      })),
    });
    if (saved.error) throw saved.error;
    return { weekNumber, games: saved.data as number };
  } catch (error) {
    await db
      .from("course_weeks")
      .update({
        generation_status: "failed",
        generation_error:
          error instanceof HttpError
            ? error.message
            : "No se pudieron generar los juegos. El material no pasó las validaciones o no fue suficiente.",
      })
      .eq("course_id", courseId)
      .eq("week_number", weekNumber);
    throw error;
  }
}
