import { z } from "zod";

/**
 * Contrato del Modo Debate con el backend (.plans/debate-socratico-spec.md §9).
 * Sigue las convenciones del markdown v0.3: `difficulty` es "baja" | "media" | "alta".
 */

export const debateDifficultySchema = z.enum(["baja", "media", "alta"]);
export type DebateDifficulty = z.infer<typeof debateDifficultySchema>;

export const inputModeSchema = z.enum(["voz", "texto"]);
export type InputMode = z.infer<typeof inputModeSchema>;

export const debateTopicSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  semana: z.number().int(),
});
export type DebateTopic = z.infer<typeof debateTopicSchema>;

export const debateSetupSchema = z.object({
  /** false: el curso no tiene el plan Premium; el resto de campos se ignora. */
  premium: z.boolean(),
  difficulty: debateDifficultySchema,
  /** Elegidos por el sistema, solo lectura. */
  topics: z.array(debateTopicSchema),
  totalSeconds: z.number().int().positive(),
  turnSeconds: z.number().int().positive(),
  /** false si el curso no tiene temas publicados suficientes para este nivel. */
  available: z.boolean(),
  requiredTopics: z.number().int().positive(),
});
export type DebateSetup = z.infer<typeof debateSetupSchema>;

export const debateQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  kind: z.enum(["eje", "repregunta"]),
  /** Temas que cruza la pregunta. No revela la calidad de las respuestas. */
  topicIds: z.array(z.string()),
  canRephrase: z.boolean(),
});
export type DebateQuestion = z.infer<typeof debateQuestionSchema>;

export const debateHistoryItemSchema = z.object({
  question: debateQuestionSchema,
  answer: z.string().nullable(),
  rephrased: z.boolean(),
});
export type DebateHistoryItem = z.infer<typeof debateHistoryItemSchema>;

export const debateSessionSchema = z.object({
  debateId: z.string(),
  courseId: z.string(),
  difficulty: debateDifficultySchema,
  topics: z.array(debateTopicSchema),
  totalSeconds: z.number().int().positive(),
  turnSeconds: z.number().int().positive(),
  startedAt: z.iso.datetime(),
  /** Hora del servidor. Se recalcula en cada turno: descuenta el tiempo que la IA estuvo "pensando". */
  deadline: z.iso.datetime(),
  serverTime: z.iso.datetime(),
  question: debateQuestionSchema,
  /** Turnos ya enviados; permite recargar la página sin perder el historial. */
  history: z.array(debateHistoryItemSchema),
});
export type DebateSession = z.infer<typeof debateSessionSchema>;

export const debateTurnRequestSchema = z.object({
  questionId: z.string(),
  action: z.enum(["answer", "pass"]),
  /** Fuente de verdad: la transcripción ya editada o el texto escrito. */
  text: z.string(),
  inputModes: z.array(inputModeSchema),
  dictatedChars: z.number().int().nonnegative(),
  typedChars: z.number().int().nonnegative(),
  pasteAttempts: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  /** true si lo envió el tope del turno o el reloj global. */
  timedOut: z.boolean(),
});
export type DebateTurnRequest = z.infer<typeof debateTurnRequestSchema>;

export const debateTurnResponseSchema = z.object({
  status: z.enum(["continue", "closed"]),
  deadline: z.iso.datetime(),
  serverTime: z.iso.datetime(),
  question: debateQuestionSchema.optional(),
});
export type DebateTurnResponse = z.infer<typeof debateTurnResponseSchema>;

export const debateRephraseResponseSchema = z.object({
  question: debateQuestionSchema,
  deadline: z.iso.datetime(),
  serverTime: z.iso.datetime(),
});
export type DebateRephraseResponse = z.infer<typeof debateRephraseResponseSchema>;

export const integrityEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paste_blocked"), questionId: z.string(), at: z.iso.datetime() }),
  z.object({
    type: z.literal("tab_hidden"),
    questionId: z.string(),
    at: z.iso.datetime(),
    durationMs: z.number().int().nonnegative().optional(),
  }),
]);
export type IntegrityEvent = z.infer<typeof integrityEventSchema>;

export const debateFinishReasonSchema = z.enum(["timeout", "user_finished"]);
export type DebateFinishReason = z.infer<typeof debateFinishReasonSchema>;

export const okSchema = z.object({ ok: z.literal(true) });

export const criterionIdSchema = z.enum(["precision", "integracion", "argumentacion", "repregunta"]);
export type CriterionId = z.infer<typeof criterionIdSchema>;

export const turnMarkSchema = z.enum(["solida", "imprecisa", "erronea", "evadida", "pasada"]);
export type TurnMark = z.infer<typeof turnMarkSchema>;

const scoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
const starsSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const debateReportSchema = z.object({
  debateId: z.string(),
  courseId: z.string(),
  difficulty: debateDifficultySchema,
  topics: z.array(debateTopicSchema),
  /** 0–4, un decimal. */
  overall: z.number().min(0).max(4),
  stars: starsSchema,
  verdict: z.string().max(280),
  criteria: z.array(
    z.object({
      id: criterionIdSchema,
      score: scoreSchema,
      strength: z.string().max(160),
      improvement: z.string().max(160),
    }),
  ),
  errors: z.array(
    z.object({
      turnIndex: z.number().int().nonnegative(),
      quote: z.string(),
      correction: z.string(),
      source: z.object({
        documento: z.string(),
        pagina: z.number().int().optional(),
        semana: z.number().int(),
      }),
    }),
  ),
  stats: z.object({
    questionsTotal: z.number().int().nonnegative(),
    answered: z.number().int().nonnegative(),
    passed: z.number().int().nonnegative(),
    rephrasesUsed: z.number().int().nonnegative(),
    /** Solo turnos respondidos. */
    avgResponseMs: z.number().nonnegative(),
    /** 0–1: caracteres dictados / caracteres totales. */
    voiceShare: z.number().min(0).max(1),
    durationMs: z.number().nonnegative(),
  }),
  integrity: z.object({
    pasteAttempts: z.number().int().nonnegative(),
    tabHidden: z.number().int().nonnegative(),
  }),
  transcript: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      question: debateQuestionSchema,
      rephrased: z.boolean(),
      answer: z.string().nullable(),
      inputModes: z.array(inputModeSchema),
      durationMs: z.number().nonnegative(),
      mark: turnMarkSchema,
      comment: z.string().optional(),
    }),
  ),
  createdAt: z.iso.datetime(),
});
export type DebateReport = z.infer<typeof debateReportSchema>;

/** `GET /report` responde 202 con esto mientras el mediador evalúa. */
export const debateEvaluatingSchema = z.object({ status: z.literal("evaluating") });

export const debateReportStateSchema = z.union([debateEvaluatingSchema, debateReportSchema]);
export type DebateReportState = z.infer<typeof debateReportStateSchema>;

export const debateSummarySchema = z.object({
  debateId: z.string(),
  createdAt: z.iso.datetime(),
  difficulty: debateDifficultySchema,
  topics: z.array(debateTopicSchema),
  overall: z.number().min(0).max(4),
  stars: starsSchema,
});
export type DebateSummary = z.infer<typeof debateSummarySchema>;
