import { z } from "zod";
import {
  debateEvaluatingSchema,
  debateRephraseResponseSchema,
  debateReportStateSchema,
  debateSessionSchema,
  debateSetupSchema,
  debateSummarySchema,
  debateTurnResponseSchema,
  okSchema,
  type DebateDifficulty,
  type DebateFinishReason,
  type DebateTurnRequest,
  type IntegrityEvent,
} from "@/features/debate/schema";
import { apiRequest } from "./client";

/** Cliente del Modo Debate (.plans/debate-socratico-spec.md §9). */

export function getDebateSetup(courseId: string, difficulty: DebateDifficulty) {
  return apiRequest(`/api/courses/${courseId}/debates/setup?difficulty=${difficulty}`, debateSetupSchema);
}

export function createDebate(courseId: string, difficulty: DebateDifficulty) {
  return apiRequest(`/api/courses/${courseId}/debates`, debateSessionSchema, {
    method: "POST",
    body: JSON.stringify({ difficulty }),
  });
}

export function getDebate(debateId: string) {
  return apiRequest(`/api/debates/${debateId}`, debateSessionSchema);
}

/** Con `audio`, el turno viaja como multipart: el JSON en "turn" y el audio en "audio". */
export function submitDebateTurn(debateId: string, turn: DebateTurnRequest, audio?: Blob | null) {
  let body: BodyInit = JSON.stringify(turn);
  if (audio) {
    const form = new FormData();
    form.append("turn", body);
    form.append("audio", audio, "turno.webm");
    body = form;
  }
  return apiRequest(`/api/debates/${debateId}/turns`, debateTurnResponseSchema, { method: "POST", body });
}

export function rephraseDebateQuestion(debateId: string) {
  return apiRequest(`/api/debates/${debateId}/rephrase`, debateRephraseResponseSchema, { method: "POST" });
}

export function sendDebateEvents(debateId: string, events: IntegrityEvent[]) {
  return apiRequest(`/api/debates/${debateId}/events`, okSchema, {
    method: "POST",
    body: JSON.stringify({ events }),
    // Debe llegar aunque el estudiante cierre la pestaña.
    keepalive: true,
  });
}

export function finishDebate(debateId: string, reason: DebateFinishReason) {
  return apiRequest(`/api/debates/${debateId}/finish`, debateEvaluatingSchema, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function discardDebate(debateId: string) {
  return apiRequest(`/api/debates/${debateId}`, okSchema, { method: "DELETE" });
}

export function getDebateReport(debateId: string) {
  return apiRequest(`/api/debates/${debateId}/report`, debateReportStateSchema);
}

export function listDebates(courseId: string) {
  return apiRequest(`/api/courses/${courseId}/debates`, z.array(debateSummarySchema));
}
