"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChallenge,
  getChallenge,
  getCourseProgress,
  revealHint,
  submitAnswer,
  type ClientChallengeSession,
} from "./challenges";
import type { ChallengeResult, ChallengeSession, CreateChallengeBody, ProgressTotals } from "./schemas";

export const queryKeys = {
  progress: (courseId: string) => ["courses", courseId, "progress"] as const,
  challenge: (sessionId: string) => ["challenges", sessionId] as const,
  outcome: (sessionId: string) => ["challenges", sessionId, "outcome"] as const,
};

/** Lo que la pantalla de resultado necesita y el API no devuelve (medido en el cliente). */
export interface ChallengeOutcome {
  session: ClientChallengeSession;
  result: ChallengeResult;
  hintUsed: boolean;
  elapsedMs: number;
  totalMs: number;
}

export function useCourseProgress(courseId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.progress(courseId ?? ""),
    queryFn: () => getCourseProgress(courseId!),
    enabled: Boolean(courseId),
  });
}

export function useChallengeSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.challenge(sessionId),
    queryFn: () => getChallenge(sessionId),
    // Una sesión no cambia: no se vuelve a pedir mientras se juega.
    staleTime: Infinity,
    retry: false,
  });
}

export function useCreateChallenge(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChallengeBody) => createChallenge(courseId, body),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.challenge(session.sessionId), session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.progress(courseId) });
    },
  });
}

export function useRevealHint(sessionId: string) {
  return useMutation({ mutationFn: () => revealHint(sessionId) });
}

export function useSubmitAnswer(session: ChallengeSession) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answer: unknown) => submitAnswer(session.sessionId, { answer }),
    onSuccess: (result) => {
      queryClient.setQueryData<ProgressTotals>(queryKeys.progress(session.courseId), result.totals);
    },
  });
}

export function useSaveOutcome() {
  const queryClient = useQueryClient();
  return (outcome: ChallengeOutcome) =>
    queryClient.setQueryData(queryKeys.outcome(outcome.session.sessionId), outcome);
}

export function useOutcome(sessionId: string): ChallengeOutcome | undefined {
  return useQueryClient().getQueryData<ChallengeOutcome>(queryKeys.outcome(sessionId));
}
