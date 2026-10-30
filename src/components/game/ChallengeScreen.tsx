"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { getGameDefinition, type AnyGameDefinition } from "@/games/registry";
import type { ClientChallengeSession } from "@/lib/api/challenges";
import { errorMessage } from "@/lib/api/client";
import { useChallengeSession, useOutcome } from "@/lib/api/queries";
import { GameSessionProvider } from "@/stores/GameSessionProvider";
import { GameShell } from "./GameShell";

/** Carga la sesión, valida su payload con el juego que toca y monta el GameShell. */
export function ChallengeScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const query = useChallengeSession(sessionId);
  // Se lee solo al montar: el resultado que se guarda durante este mismo reto no debe redirigir.
  const outcome = useOutcome(sessionId);
  const [answeredBefore] = useState(() => Boolean(outcome));

  // Un reto ya respondido no se vuelve a jugar (p. ej. al volver atrás desde el resultado).
  useEffect(() => {
    if (answeredBefore) router.replace(`/reto/${sessionId}/resultado`);
  }, [answeredBefore, router, sessionId]);

  if (query.isPending || answeredBefore) return <ChallengeSkeleton />;
  if (query.isError) return <ChallengeError message={errorMessage(query.error)} />;

  const definition = getGameDefinition(query.data.game);
  if (!definition) return <ChallengeError message={copy.errors.UNKNOWN_GAME} />;

  return <ValidatedChallenge key={sessionId} session={query.data} definition={definition} />;
}

function ValidatedChallenge({
  session,
  definition,
}: {
  session: ClientChallengeSession;
  definition: AnyGameDefinition;
}) {
  const parsed = useMemo(() => definition.payloadSchema.safeParse(session.payload), [definition, session]);
  if (!parsed.success) return <ChallengeError message={copy.errors.INVALID_PAYLOAD} />;

  return (
    <GameSessionProvider session={session}>
      <GameShell definition={definition} payload={parsed.data} />
    </GameSessionProvider>
  );
}

function ChallengeSkeleton() {
  return (
    <div className="flex h-dvh flex-col bg-bg" aria-busy>
      <div className="flex h-14 items-center justify-between px-4 lg:h-16 lg:px-8">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="px-4 lg:px-8">
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <main className="mx-auto flex w-full max-w-240 flex-1 flex-col items-center gap-6 px-4 py-6 lg:px-8">
        <p className="self-start type-prompt text-text-secondary">{copy.common.loadingChallenge}</p>
        <Skeleton className="h-64 w-full max-w-xl lg:h-76" />
      </main>
    </div>
  );
}

function ChallengeError({ message }: { message: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-bg px-4">
      <EmptyState
        title={message}
        action={
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            {copy.common.backToChallenges}
          </Link>
        }
      />
    </div>
  );
}
