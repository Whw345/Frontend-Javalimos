import { apiRequest } from "./client";
import {
  challengeResultSchema,
  challengeSessionSchema,
  hintResponseSchema,
  progressTotalsSchema,
  type ChallengeSession,
  type CreateChallengeBody,
  type SubmitAnswerBody,
} from "./schemas";

/** Sesión + desfase de reloj medido al recibirla (§17: "Reloj"). */
export interface ClientChallengeSession extends ChallengeSession {
  /** hora del servidor − hora del cliente, en ms. */
  clockOffsetMs: number;
}

function withClockOffset(session: ChallengeSession): ClientChallengeSession {
  return { ...session, clockOffsetMs: Date.parse(session.serverTime) - Date.now() };
}

export function getCourseProgress(courseId: string) {
  return apiRequest(`/api/courses/${courseId}/progress`, progressTotalsSchema);
}

export async function createChallenge(courseId: string, body: CreateChallengeBody) {
  const session = await apiRequest(`/api/courses/${courseId}/challenges`, challengeSessionSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return withClockOffset(session);
}

/** Propuesto al backend: permite recargar /reto/[sessionId] sin perder la sesión. */
export async function getChallenge(sessionId: string) {
  return withClockOffset(await apiRequest(`/api/challenges/${sessionId}`, challengeSessionSchema));
}

export function revealHint(sessionId: string) {
  return apiRequest(`/api/challenges/${sessionId}/hint`, hintResponseSchema, { method: "POST" });
}

export function submitAnswer(sessionId: string, body: SubmitAnswerBody) {
  return apiRequest(`/api/challenges/${sessionId}/answer`, challengeResultSchema, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
