import { DEBATE_LEVELS } from "@/features/debate/levels";
import { debateStars } from "@/features/debate/logic";
import type {
  CriterionId,
  DebateDifficulty,
  DebateQuestion,
  DebateReport,
  DebateSession,
  DebateSetup,
  DebateSummary,
  DebateTopic,
  DebateTurnRequest,
  DebateTurnResponse,
  IntegrityEvent,
  TurnMark,
} from "@/features/debate/schema";
import type { Atom } from "@/games/types";
import { biologyEarlierWeeksAtoms, biologyWeek5Atoms } from "./data/atoms";
import { CURRENT_WEEK } from "./db";
import { shuffle } from "./random";
import { keywordsOf, mentions, normalize, wordCount } from "./text";

/**
 * Backend simulado del Modo Debate. Sustituye a los dos LLM del backend real:
 * el entrevistador socrático (preguntas y repreguntas) y el mediador (informe).
 * Mismo contrato que el real (src/features/debate/schema.ts); vive en memoria.
 */

/** Tiempo que el entrevistador "piensa" por turno; el reloj global no lo descuenta. */
export const THINKING_MS = 1200;
export const REPHRASE_MS = 800;
/** Latencia del mediador antes de que el informe esté listo. */
export const EVALUATION_MS = 2500;
/** Margen de red que el servidor acepta después del deadline (§17 del DS). */
export const NETWORK_GRACE_MS = 1500;
const MAX_FOLLOW_UPS = 2;
const MIN_DEVELOPED_WORDS = 15;

const CAUSAL_CONNECTORS = [
  "porque",
  "ya que",
  "por lo tanto",
  "por eso",
  "debido a",
  "entonces",
  "asi que",
  "por ejemplo",
  "es decir",
  "sin embargo",
  "en cambio",
  "mientras que",
];

const courseAtoms: Atom[] = [...biologyWeek5Atoms, ...biologyEarlierWeeksAtoms];

/** Para la demo: todo curso es Premium salvo los que tengan "gratis" en el id. */
export function isPremiumCourse(courseId: string): boolean {
  return !courseId.includes("gratis");
}

export class DebateMockError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

interface StoredTurn {
  question: DebateQuestion;
  rephrased: boolean;
  request: DebateTurnRequest;
}

interface StoredDebate {
  session: DebateSession;
  atoms: Atom[];
  turns: StoredTurn[];
  axisCount: number;
  followUps: number;
  questionCount: number;
  events: IntegrityEvent[];
  status: "active" | "evaluating";
  evaluateAt?: number;
  report?: DebateReport;
}

const debates = new Map<string, StoredDebate>();
const setups = new Map<string, Atom[]>();
const historyByCourse = new Map<string, DebateSummary[]>();

const toTopic = (atom: Atom): DebateTopic => ({ id: atom.id, nombre: atom.concepto, semana: atom.semana });
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
const name = (atom: Atom) => lowerFirst(atom.concepto);

/** Tema de la semana actual + temas de semanas anteriores, como un examen acumulativo. */
function pickTopics(count: number): Atom[] {
  const current = shuffle(courseAtoms.filter((atom) => atom.semana === CURRENT_WEEK));
  const earlier = shuffle(courseAtoms.filter((atom) => atom.semana < CURRENT_WEEK));
  const picked = [current[0]!, ...earlier.slice(0, count - 1)];
  // Si faltan temas de semanas anteriores, se completa con la semana actual.
  return [...picked, ...current.slice(1)].slice(0, count);
}

export function getDebateSetup(courseId: string, difficulty: DebateDifficulty): DebateSetup {
  const level = DEBATE_LEVELS[difficulty];
  const base = {
    premium: isPremiumCourse(courseId),
    difficulty,
    totalSeconds: level.totalSeconds,
    turnSeconds: level.turnSeconds,
    requiredTopics: level.topics,
    available: courseAtoms.length >= level.topics,
  };
  if (!base.premium || !base.available) return { ...base, topics: [] };

  const key = `${courseId}:${difficulty}`;
  let atoms = setups.get(key);
  if (!atoms) {
    atoms = pickTopics(level.topics);
    setups.set(key, atoms);
  }
  return { ...base, topics: atoms.map(toTopic) };
}

// ── Entrevistador ────────────────────────────────────────────────────────────

type QuestionTemplate = (a: Atom, b: Atom) => { text: string; rephrase: string };

const AXIS_TEMPLATES: QuestionTemplate[] = [
  (a, b) => ({
    text: `¿Qué relación hay entre ${name(a)} y ${name(b)}? Explícala con un ejemplo del curso.`,
    rephrase: `Piensa en ${name(a)} y en ${name(b)}: ¿de qué manera uno depende del otro o lo explica?`,
  }),
  (a, b) => ({
    text: `¿En qué se diferencian ${name(a)} y ${name(b)}, y por qué importa esa diferencia?`,
    rephrase: `Compara ${name(a)} con ${name(b)}: ¿qué los distingue y qué cambia por esa diferencia?`,
  }),
  (a, b) => ({
    text: `Alguien afirma: «${a.confusiones[0]}» ¿Qué le responderías usando lo que sabes de ${name(b)}?`,
    rephrase: `Evalúa esta idea: «${a.confusiones[0]}» ¿Es correcta? Apóyate en ${name(b)} para justificarlo.`,
  }),
  (a, b) => ({
    text: `Si ${name(a)} no ocurriera como debe, ¿qué consecuencias tendría para ${name(b)}?`,
    rephrase: `Imagina que ${name(a)} falla. ¿Qué le pasaría a ${name(b)} y por qué?`,
  }),
];

/** Textos de cada pregunta, guardados aparte para poder reformularla sin enviarlos al cliente. */
const rephrasings = new Map<string, string>();

function makeQuestion(
  debate: StoredDebate,
  kind: DebateQuestion["kind"],
  topicIds: string[],
  text: string,
  rephrase: string,
): DebateQuestion {
  debate.questionCount += 1;
  const id = `${debate.session.debateId}-q${debate.questionCount}`;
  rephrasings.set(id, rephrase);
  return { id, text, kind, topicIds, canRephrase: true };
}

/** Pregunta eje: cruza dos temas y rota para que todos aparezcan. */
function axisQuestion(debate: StoredDebate): DebateQuestion {
  const n = debate.atoms.length;
  const index = debate.axisCount;
  const a = debate.atoms[index % n]!;
  const b = debate.atoms[(index + 1) % n]!;
  const { text, rephrase } = AXIS_TEMPLATES[index % AXIS_TEMPLATES.length]!(a, b);
  debate.axisCount += 1;
  debate.followUps = 0;
  return makeQuestion(debate, "eje", [a.id, b.id], text, rephrase);
}

const atomsOf = (debate: StoredDebate, ids: string[]) => debate.atoms.filter((atom) => ids.includes(atom.id));

/** Menciona el tema por su nombre o por al menos dos de sus ideas clave. */
function mentionsTopic(normalizedText: string, atom: Atom): boolean {
  const nameWords = normalize(atom.concepto)
    .split(/[\s-]+/)
    .filter((word) => word.length >= 5);
  if (nameWords.some((word) => mentions(normalizedText, word))) return true;
  const ideas = keywordsOf(atom.definicion, atom.concepto);
  return ideas.filter((idea) => mentions(normalizedText, idea.key)).length >= 2;
}

const hasCausalConnector = (normalizedText: string) =>
  CAUSAL_CONNECTORS.some((connector) => normalizedText.includes(connector));

/** Decide la siguiente pregunta: repregunta si la respuesta quedó corta, si no otra pregunta eje. */
function nextQuestion(debate: StoredDebate, turn: StoredTurn): DebateQuestion {
  if (turn.request.action === "pass" || debate.followUps >= MAX_FOLLOW_UPS) return axisQuestion(debate);

  const text = normalize(turn.request.text);
  const topics = atomsOf(debate, turn.question.topicIds);
  const missing = topics.find((atom) => !mentionsTopic(text, atom));
  const ids = turn.question.topicIds;

  const followUp = (questionText: string, rephrase: string) => {
    debate.followUps += 1;
    return makeQuestion(debate, "repregunta", ids, questionText, rephrase);
  };

  if (wordCount(turn.request.text) < MIN_DEVELOPED_WORDS) {
    return followUp(
      "¿Por qué? Desarrolla tu idea con un ejemplo concreto.",
      "Explica con más detalle el porqué de lo que dijiste y da un ejemplo.",
    );
  }
  if (missing) {
    return followUp(
      `¿Y cómo se conecta lo que dijiste con ${name(missing)}?`,
      `Relaciona tu respuesta con ${name(missing)}: ¿qué tiene que ver una cosa con la otra?`,
    );
  }
  if (!hasCausalConnector(text)) {
    return followUp(
      "¿Qué pasaría si eso no ocurriera así? Explica la causa.",
      "Explica la causa: ¿por qué sucede lo que describiste y qué cambiaría si no sucediera?",
    );
  }
  return axisQuestion(debate);
}

const iso = (ms: number) => new Date(ms).toISOString();

export function createDebate(courseId: string, difficulty: DebateDifficulty, now: number): DebateSession {
  const setup = getDebateSetup(courseId, difficulty);
  if (!setup.premium) throw new DebateMockError(403, "PREMIUM_REQUIRED", "Requiere Premium");
  if (!setup.available) throw new DebateMockError(409, "NOT_ENOUGH_TOPICS", "Faltan temas");

  const atoms = setups.get(`${courseId}:${difficulty}`)!;
  // El próximo debate con este nivel elegirá otros temas.
  setups.delete(`${courseId}:${difficulty}`);

  const debate: StoredDebate = {
    session: {
      debateId: crypto.randomUUID(),
      courseId,
      difficulty,
      topics: atoms.map(toTopic),
      totalSeconds: setup.totalSeconds,
      turnSeconds: setup.turnSeconds,
      startedAt: iso(now),
      deadline: iso(now + setup.totalSeconds * 1000),
      serverTime: iso(now),
      // Se reemplaza enseguida por la primera pregunta eje.
      question: { id: "", text: "-", kind: "eje", topicIds: [], canRephrase: false },
      history: [],
    },
    atoms,
    turns: [],
    axisCount: 0,
    followUps: 0,
    questionCount: 0,
    events: [],
    status: "active",
  };
  debate.session.question = axisQuestion(debate);
  debates.set(debate.session.debateId, debate);
  return structuredClone(debate.session);
}

function requireDebate(debateId: string): StoredDebate {
  const debate = debates.get(debateId);
  if (!debate) throw new DebateMockError(404, "DEBATE_NOT_FOUND", "Debate no encontrado");
  return debate;
}

function requireActive(debateId: string): StoredDebate {
  const debate = requireDebate(debateId);
  if (debate.status !== "active") throw new DebateMockError(409, "DEBATE_CLOSED", "El debate terminó");
  return debate;
}

export function getDebateSession(debateId: string, now: number): DebateSession {
  const debate = requireActive(debateId);
  return { ...structuredClone(debate.session), serverTime: iso(now) };
}

export function submitTurn(debateId: string, request: DebateTurnRequest, now: number): DebateTurnResponse {
  const debate = requireActive(debateId);
  const deadline = Date.parse(debate.session.deadline);
  if (request.questionId !== debate.session.question.id) {
    throw new DebateMockError(400, "BAD_REQUEST", "La pregunta no es la actual");
  }
  if (now > deadline + NETWORK_GRACE_MS) {
    throw new DebateMockError(409, "DEBATE_CLOSED", "El tiempo del debate terminó");
  }

  const rephrased = !debate.session.question.canRephrase;
  const turn: StoredTurn = { question: debate.session.question, rephrased, request };
  debate.turns.push(turn);
  debate.session.history.push({
    question: turn.question,
    answer: request.action === "pass" ? null : request.text,
    rephrased,
  });

  // Casi sin tiempo: no vale la pena otra pregunta.
  if (now >= deadline - 1000) {
    return { status: "closed", deadline: debate.session.deadline, serverTime: iso(now) };
  }

  debate.session.question = nextQuestion(debate, turn);
  // El reloj global no descuenta el tiempo que el entrevistador estuvo "pensando".
  debate.session.deadline = iso(deadline + THINKING_MS);
  return {
    status: "continue",
    deadline: debate.session.deadline,
    serverTime: iso(now + THINKING_MS),
    question: structuredClone(debate.session.question),
  };
}

export function rephraseQuestion(debateId: string, now: number) {
  const debate = requireActive(debateId);
  const question = debate.session.question;
  if (!question.canRephrase) throw new DebateMockError(409, "REPHRASE_USED", "Ya se reformuló");

  debate.session.question = {
    ...question,
    text: rephrasings.get(question.id) ?? question.text,
    canRephrase: false,
  };
  debate.session.deadline = iso(Date.parse(debate.session.deadline) + REPHRASE_MS);
  return {
    question: structuredClone(debate.session.question),
    deadline: debate.session.deadline,
    serverTime: iso(now + REPHRASE_MS),
  };
}

export function recordEvents(debateId: string, events: IntegrityEvent[]): void {
  requireDebate(debateId).events.push(...events);
}

export function finishDebate(debateId: string, now: number): void {
  const debate = requireActive(debateId);
  debate.status = "evaluating";
  debate.evaluateAt = now + EVALUATION_MS;
  debate.report = evaluateDebate(debate, now);

  const history = historyByCourse.get(debate.session.courseId) ?? [];
  const { report } = debate;
  history.unshift({
    debateId,
    createdAt: report.createdAt,
    difficulty: report.difficulty,
    topics: report.topics,
    overall: report.overall,
    stars: report.stars,
  });
  historyByCourse.set(debate.session.courseId, history);
}

export function discardDebate(debateId: string): void {
  requireActive(debateId);
  debates.delete(debateId);
}

/** `null` mientras el mediador evalúa. */
export function getDebateReport(debateId: string, now: number): DebateReport | null {
  const debate = requireDebate(debateId);
  if (!debate.report) throw new DebateMockError(409, "DEBATE_NOT_FINISHED", "El debate sigue en curso");
  return now < (debate.evaluateAt ?? 0) ? null : debate.report;
}

export function listDebates(courseId: string): DebateSummary[] {
  return historyByCourse.get(courseId) ?? [];
}

// ── Mediador ─────────────────────────────────────────────────────────────────

interface TurnAnalysis {
  mark: TurnMark;
  words: number;
  topicsMentioned: number;
  causal: boolean;
  error?: DebateReport["errors"][number];
}

const sentences = (text: string) => text.split(/(?<=[.!?¿¡])\s+/).filter(Boolean);

/** Busca una afirmación que coincide con una confusión típica del átomo y no con su definición. */
function findError(text: string, atoms: Atom[], turnIndex: number): TurnAnalysis["error"] {
  const normalized = normalize(text);
  for (const atom of atoms) {
    const definitionKeys = new Set(keywordsOf(atom.definicion, atom.concepto).map((idea) => idea.key));
    for (const confusion of atom.confusiones) {
      const distinct = keywordsOf(confusion, atom.concepto).filter((idea) => !definitionKeys.has(idea.key));
      const hits = distinct.filter((idea) => mentions(normalized, idea.key));
      if (distinct.length === 0 || hits.length < Math.min(2, distinct.length)) continue;

      const quote = sentences(text).find((sentence) => mentions(normalize(sentence), hits[0]!.key)) ?? text;
      return {
        turnIndex,
        quote: quote.slice(0, 280),
        correction: atom.definicion,
        source: { documento: atom.fuente.documento, pagina: atom.fuente.pagina, semana: atom.semana },
      };
    }
  }
  return undefined;
}

function analyzeTurn(debate: StoredDebate, turn: StoredTurn, index: number): TurnAnalysis {
  if (turn.request.action === "pass") return { mark: "pasada", words: 0, topicsMentioned: 0, causal: false };

  const text = turn.request.text;
  const normalized = normalize(text);
  const words = wordCount(text);
  const questionAtoms = atomsOf(debate, turn.question.topicIds);
  const ideas = questionAtoms.flatMap((atom) => keywordsOf(atom.definicion, atom.concepto));
  const hits = ideas.filter((idea) => mentions(normalized, idea.key)).length;
  const topicsMentioned = debate.atoms.filter((atom) => mentionsTopic(normalized, atom)).length;
  const causal = hasCausalConnector(normalized);
  const error = findError(text, questionAtoms, index);

  let mark: TurnMark;
  if (error) mark = "erronea";
  else if (words < 5 || (hits === 0 && topicsMentioned === 0)) mark = "evadida";
  else if (hits >= 2 && words >= 12) mark = "solida";
  else mark = "imprecisa";

  return { mark, words, topicsMentioned, causal, error };
}

const clampScore = (value: number) => Math.max(0, Math.min(4, Math.round(value))) as 0 | 1 | 2 | 3 | 4;
const ratio = (part: number, total: number) => (total > 0 ? part / total : 0);

type Band = "alto" | "medio" | "bajo";
const bandOf = (score: number): Band => (score >= 3 ? "alto" : score === 2 ? "medio" : "bajo");

const CRITERION_TEXT: Record<CriterionId, Record<Band, { strength: string; improvement: string }>> = {
  precision: {
    alto: {
      strength: "Tus afirmaciones coinciden con lo que dice el material.",
      improvement: "Usa los términos exactos del curso para que no quede duda.",
    },
    medio: {
      strength: "Manejas la idea general de los temas.",
      improvement: "Te faltaron ideas clave del material; precisa definiciones y procesos.",
    },
    bajo: {
      strength: "Te animaste a responder sin consultar nada.",
      improvement: "Repasa las definiciones del material: varias respuestas no coincidían con él.",
    },
  },
  integracion: {
    alto: {
      strength: "Conectaste los temas entre sí en lugar de responderlos por separado.",
      improvement: "Prueba a explicar la relación con un ejemplo que use ambos temas.",
    },
    medio: {
      strength: "En algunas respuestas relacionaste dos temas.",
      improvement: "Menciona siempre los dos temas de la pregunta y explica cómo se relacionan.",
    },
    bajo: {
      strength: "Respondiste cada tema por su cuenta.",
      improvement: "El debate pide relacionar temas: di qué tiene que ver uno con el otro.",
    },
  },
  argumentacion: {
    alto: {
      strength: "Diste razones y ejemplos, no solo afirmaciones.",
      improvement: "Cierra cada respuesta con una conclusión breve.",
    },
    medio: {
      strength: "Algunas respuestas tenían una razón clara.",
      improvement: "Usa «porque» y «por ejemplo»: afirmación, razón y ejemplo.",
    },
    bajo: {
      strength: "Tus respuestas fueron directas.",
      improvement: "Desarrolla más: explica el porqué de lo que afirmas y apóyalo con un ejemplo.",
    },
  },
  repregunta: {
    alto: {
      strength: "Cuando te presionaron, respondiste lo que se te preguntaba.",
      improvement: "Aprovecha la repregunta para agregar una idea nueva, no solo repetir.",
    },
    medio: {
      strength: "Respondiste parte de las repreguntas.",
      improvement: "Ante una repregunta, responde primero exactamente lo que te piden.",
    },
    bajo: {
      strength: "Seguiste en el debate hasta el final.",
      improvement: "Evita pasar o salirte del tema cuando te repreguntan: es lo que más pesa en un oral.",
    },
  },
};

const TURN_COMMENT: Partial<Record<TurnMark, string>> = {
  solida: "Respuesta con ideas clave del material.",
  imprecisa: "Vas en la dirección correcta, pero faltan ideas clave.",
  erronea: "Contiene una afirmación que contradice el material.",
  evadida: "No respondió lo que se preguntaba.",
};

const MARK_WEIGHT: Record<TurnMark, number> = {
  solida: 2,
  imprecisa: 1,
  erronea: -1,
  evadida: 0,
  pasada: -0.5,
};

function verdictFor(
  debate: StoredDebate,
  analyses: TurnAnalysis[],
  overall: number,
  answered: number,
): string {
  if (answered === 0) {
    return "No respondiste ninguna pregunta. Repasa los temas e intenta otro debate.";
  }
  const scoreByTopic = new Map(debate.atoms.map((atom) => [atom.id, 0]));
  debate.turns.forEach((turn, index) => {
    for (const id of turn.question.topicIds) {
      scoreByTopic.set(id, (scoreByTopic.get(id) ?? 0) + MARK_WEIGHT[analyses[index]!.mark]);
    }
  });
  const ranked = [...debate.atoms].sort((a, b) => scoreByTopic.get(b.id)! - scoreByTopic.get(a.id)!);
  const best = ranked[0]!.concepto;
  const worst = lowerFirst(ranked[ranked.length - 1]!.concepto);

  if (overall >= 3)
    return `Buen debate: dominas ${best}. Para el examen, refuerza cómo se conecta con ${worst}.`;
  if (overall >= 2) return `Vas bien en ${best}, pero cuando lo conectas con ${worst} te falta precisión.`;
  return `Todavía te cuesta argumentar sobre ${worst}. Repasa el material y vuelve a intentarlo.`;
}

function evaluateDebate(debate: StoredDebate, now: number): DebateReport {
  const analyses = debate.turns.map((turn, index) => analyzeTurn(debate, turn, index));
  const answeredTurns = analyses.filter((analysis) => analysis.mark !== "pasada");
  const answered = answeredTurns.length;
  const count = (mark: TurnMark) => analyses.filter((analysis) => analysis.mark === mark).length;

  const precision = clampScore(
    4 * ratio(count("solida") + 0.5 * count("imprecisa") - count("erronea"), answered),
  );
  const integracion = clampScore(
    4 * ratio(answeredTurns.filter((analysis) => analysis.topicsMentioned >= 2).length, answered),
  );
  const argumentacion = clampScore(
    4 *
      ratio(
        answeredTurns.reduce(
          (sum, analysis) => sum + (analysis.causal ? 0.5 : 0) + (analysis.words >= 20 ? 0.5 : 0),
          0,
        ),
        answered,
      ),
  );
  const followUpIndexes = debate.turns
    .map((turn, index) => (turn.question.kind === "repregunta" ? index : -1))
    .filter((index) => index >= 0);
  const goodMarks: TurnMark[] = ["solida", "imprecisa"];
  const repregunta = clampScore(
    followUpIndexes.length > 0
      ? 4 *
          ratio(
            followUpIndexes.filter((index) => goodMarks.includes(analyses[index]!.mark)).length,
            followUpIndexes.length,
          )
      : 4 * ratio(answeredTurns.filter((analysis) => analysis.mark !== "evadida").length, analyses.length),
  );

  const scores: Record<CriterionId, 0 | 1 | 2 | 3 | 4> = {
    precision,
    integracion,
    argumentacion,
    repregunta,
  };
  const overall = Math.round(((precision + integracion + argumentacion + repregunta) / 4) * 10) / 10;

  const requests = debate.turns.map((turn) => turn.request);
  const dictated = requests.reduce((sum, request) => sum + request.dictatedChars, 0);
  const typed = requests.reduce((sum, request) => sum + request.typedChars, 0);
  const answeredDurations = debate.turns
    .filter((turn) => turn.request.action === "answer")
    .map((turn) => turn.request.durationMs);

  return {
    debateId: debate.session.debateId,
    courseId: debate.session.courseId,
    difficulty: debate.session.difficulty,
    topics: debate.session.topics,
    overall,
    stars: debateStars(overall),
    verdict: verdictFor(debate, analyses, overall, answered),
    criteria: (Object.keys(scores) as CriterionId[]).map((id) => ({
      id,
      score: scores[id],
      ...CRITERION_TEXT[id][bandOf(scores[id])],
    })),
    errors: analyses.flatMap((analysis) => (analysis.error ? [analysis.error] : [])),
    stats: {
      questionsTotal: debate.turns.length,
      answered: requests.filter((request) => request.action === "answer").length,
      passed: requests.filter((request) => request.action === "pass").length,
      rephrasesUsed: debate.turns.filter((turn) => turn.rephrased).length,
      avgResponseMs:
        answeredDurations.length > 0
          ? Math.round(answeredDurations.reduce((sum, ms) => sum + ms, 0) / answeredDurations.length)
          : 0,
      voiceShare: ratio(dictated, dictated + typed),
      durationMs: Math.max(0, now - Date.parse(debate.session.startedAt)),
    },
    integrity: {
      pasteAttempts: requests.reduce((sum, request) => sum + request.pasteAttempts, 0),
      tabHidden: debate.events.filter((event) => event.type === "tab_hidden").length,
    },
    transcript: debate.turns.map((turn, index) => ({
      index,
      question: turn.question,
      rephrased: turn.rephrased,
      answer: turn.request.action === "pass" ? null : turn.request.text,
      inputModes: turn.request.inputModes,
      durationMs: turn.request.durationMs,
      mark: analyses[index]!.mark,
      comment: TURN_COMMENT[analyses[index]!.mark],
    })),
    createdAt: iso(now),
  };
}
