import { delay, http, HttpResponse } from "msw";
import {
  debateDifficultySchema,
  debateFinishReasonSchema,
  debateTurnRequestSchema,
  integrityEventSchema,
} from "@/features/debate/schema";
import type { ApiErrorBody } from "@/lib/api/schemas";
import { API_BASE_URL } from "@/lib/config";
import {
  createDebate,
  DebateMockError,
  discardDebate,
  finishDebate,
  getDebateReport,
  getDebateSession,
  getDebateSetup,
  isPremiumCourse,
  listDebates,
  recordEvents,
  rephraseQuestion,
  REPHRASE_MS,
  submitTurn,
  THINKING_MS,
} from "./debate";

/** Latencia simulada para ver skeletons y estados de carga. */
const LATENCY_MS = 350;

const api = (path: string) => `${API_BASE_URL}/api${path}`;

function apiError(status: number, code: string, message: string) {
  return HttpResponse.json<ApiErrorBody>({ code, message }, { status });
}

/** Traduce los errores del backend simulado al formato uniforme `{ code, message }` (§17). */
async function handle(run: () => Promise<Response> | Response) {
  try {
    return await run();
  } catch (error) {
    if (error instanceof DebateMockError) return apiError(error.status, error.code, error.message);
    throw error;
  }
}

/**
 * El turno puede llegar como JSON o, con `NEXT_PUBLIC_DEBATE_SEND_AUDIO=true`, como multipart
 * con el audio. El mock no transcribe: ignora el audio y usa el texto.
 */
async function readTurn(request: Request): Promise<unknown> {
  if (request.headers.get("content-type")?.includes("multipart/form-data")) {
    const form = await request.formData();
    return JSON.parse(String(form.get("turn") ?? "null"));
  }
  return request.json();
}

export const debateHandlers = [
  http.get(api("/courses/:courseId/debates/setup"), async ({ params, request }) => {
    await delay(LATENCY_MS);
    const difficulty = debateDifficultySchema.safeParse(new URL(request.url).searchParams.get("difficulty"));
    if (!difficulty.success) return apiError(400, "BAD_REQUEST", "Dificultad inválida");
    return HttpResponse.json(getDebateSetup(String(params.courseId), difficulty.data));
  }),

  http.post(api("/courses/:courseId/debates"), ({ params, request }) =>
    handle(async () => {
      await delay(LATENCY_MS);
      const body = (await request.json()) as { difficulty?: unknown };
      const difficulty = debateDifficultySchema.safeParse(body.difficulty);
      if (!difficulty.success) return apiError(400, "BAD_REQUEST", "Dificultad inválida");
      return HttpResponse.json(createDebate(String(params.courseId), difficulty.data, Date.now()), {
        status: 201,
      });
    }),
  ),

  http.get(api("/courses/:courseId/debates"), async ({ params }) => {
    await delay(LATENCY_MS);
    const courseId = String(params.courseId);
    if (!isPremiumCourse(courseId)) return apiError(403, "PREMIUM_REQUIRED", "Requiere Premium");
    return HttpResponse.json(listDebates(courseId));
  }),

  http.get(api("/debates/:debateId"), ({ params }) =>
    handle(async () => {
      await delay(LATENCY_MS);
      return HttpResponse.json(getDebateSession(String(params.debateId), Date.now()));
    }),
  ),

  http.post(api("/debates/:debateId/turns"), ({ params, request }) =>
    handle(async () => {
      const parsed = debateTurnRequestSchema.safeParse(await readTurn(request));
      if (!parsed.success) return apiError(400, "BAD_REQUEST", "Turno inválido");
      const response = submitTurn(String(params.debateId), parsed.data, Date.now());
      // El entrevistador "piensa"; el deadline ya se extendió esos mismos ms.
      await delay(response.status === "continue" ? THINKING_MS : LATENCY_MS);
      return HttpResponse.json(response);
    }),
  ),

  http.post(api("/debates/:debateId/rephrase"), ({ params }) =>
    handle(async () => {
      const response = rephraseQuestion(String(params.debateId), Date.now());
      await delay(REPHRASE_MS);
      return HttpResponse.json(response);
    }),
  ),

  http.post(api("/debates/:debateId/events"), ({ params, request }) =>
    handle(async () => {
      const body = (await request.json()) as { events?: unknown };
      const events = integrityEventSchema.array().safeParse(body.events);
      if (!events.success) return apiError(400, "BAD_REQUEST", "Eventos inválidos");
      recordEvents(String(params.debateId), events.data);
      return HttpResponse.json({ ok: true });
    }),
  ),

  http.post(api("/debates/:debateId/finish"), ({ params, request }) =>
    handle(async () => {
      await delay(LATENCY_MS);
      const body = (await request.json()) as { reason?: unknown };
      if (!debateFinishReasonSchema.safeParse(body.reason).success) {
        return apiError(400, "BAD_REQUEST", "Motivo inválido");
      }
      finishDebate(String(params.debateId), Date.now());
      return HttpResponse.json({ status: "evaluating" }, { status: 202 });
    }),
  ),

  http.delete(api("/debates/:debateId"), ({ params }) =>
    handle(async () => {
      await delay(LATENCY_MS);
      discardDebate(String(params.debateId));
      return HttpResponse.json({ ok: true });
    }),
  ),

  http.get(api("/debates/:debateId/report"), ({ params }) =>
    handle(async () => {
      await delay(LATENCY_MS);
      const report = getDebateReport(String(params.debateId), Date.now());
      return report
        ? HttpResponse.json(report)
        : HttpResponse.json({ status: "evaluating" }, { status: 202 });
    }),
  ),
];
