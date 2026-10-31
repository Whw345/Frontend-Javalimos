"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DebateDifficulty } from "@/features/debate/schema";
import { createDebate, getDebate, getDebateReport, getDebateSetup, listDebates } from "./debate";

/** Poll del informe mientras el mediador evalúa (§9.1 del spec). */
const REPORT_POLL_MS = 1500;

export const debateKeys = {
  setup: (courseId: string, difficulty: DebateDifficulty) =>
    ["debates", "setup", courseId, difficulty] as const,
  session: (debateId: string) => ["debates", debateId] as const,
  report: (debateId: string) => ["debates", debateId, "report"] as const,
  history: (courseId: string) => ["courses", courseId, "debates"] as const,
};

export function useDebateSetup(courseId: string, difficulty: DebateDifficulty) {
  return useQuery({
    queryKey: debateKeys.setup(courseId, difficulty),
    queryFn: () => getDebateSetup(courseId, difficulty),
    // Los temas los elige el servidor; no deben cambiar mientras el estudiante lee la intro.
    staleTime: Infinity,
  });
}

export function useCreateDebate(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (difficulty: DebateDifficulty) => createDebate(courseId, difficulty),
    onSuccess: (session) => {
      queryClient.setQueryData(debateKeys.session(session.debateId), session);
      // La próxima intro trae otros temas.
      void queryClient.invalidateQueries({ queryKey: ["debates", "setup", courseId] });
    },
  });
}

export function useDebateSession(debateId: string) {
  return useQuery({
    queryKey: debateKeys.session(debateId),
    queryFn: () => getDebate(debateId),
    // El estado vivo lo lleva la pantalla; esta consulta solo sirve para montar o recargar,
    // y se vuelve a pedir al montar para no retomar una pregunta vieja (o un debate ya cerrado).
    staleTime: 0,
    retry: false,
  });
}

export function useDebateReport(debateId: string) {
  return useQuery({
    queryKey: debateKeys.report(debateId),
    queryFn: () => getDebateReport(debateId),
    retry: false,
    refetchInterval: (query) => (query.state.data && "status" in query.state.data ? REPORT_POLL_MS : false),
  });
}

export function useDebateHistory(courseId: string) {
  return useQuery({
    queryKey: debateKeys.history(courseId),
    queryFn: () => listDebates(courseId),
    retry: false,
  });
}
