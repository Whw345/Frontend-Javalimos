"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import type { ClientChallengeSession } from "@/lib/api/challenges";
import { createGameSessionStore, type GameSessionState, type GameSessionStore } from "./gameSessionStore";

const GameSessionContext = createContext<GameSessionStore | null>(null);

interface GameSessionProviderProps {
  session: ClientChallengeSession;
  children: ReactNode;
}

/** Monta con `key={session.sessionId}` para obtener un store nuevo por cada reto. */
export function GameSessionProvider({ session, children }: GameSessionProviderProps) {
  const [store] = useState(() => createGameSessionStore(session));
  return <GameSessionContext.Provider value={store}>{children}</GameSessionContext.Provider>;
}

export function useGameSessionStore(): GameSessionStore {
  const store = useContext(GameSessionContext);
  if (!store) throw new Error("useGameSession debe usarse dentro de <GameSessionProvider>");
  return store;
}

export function useGameSession<T>(selector: (state: GameSessionState) => T): T {
  return useStore(useGameSessionStore(), selector);
}
