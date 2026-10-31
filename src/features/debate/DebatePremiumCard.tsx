"use client";

import { Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { useDebateSetup } from "@/lib/api/debateQueries";
import { cn } from "@/lib/utils/cn";
import { DebateIcon } from "./DebateIcon";

/**
 * Tarjeta del Modo Debate en la selección de retos (§8 del spec). Va fuera de la grilla
 * numerada de los 10 minijuegos: no es uno de ellos ni consume la cuota semanal.
 */
export function DebatePremiumCard({ courseId }: { courseId: string }) {
  const setup = useDebateSetup(courseId, "baja");

  if (setup.isPending) return <Skeleton className="h-36 w-full" />;
  // Sin endpoint del Debate (p. ej. backend real sin el módulo todavía) la tarjeta no se muestra.
  if (setup.isError) return null;

  const premium = setup.data.premium;

  return (
    <Card
      interactive={premium}
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        premium && "border-cat-4/40",
      )}
    >
      <div className={cn("flex items-start gap-4", !premium && "opacity-70")}>
        <DebateIcon />
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="type-h3 text-text">{copy.debate.name}</h2>
            <Badge variant="reward">
              {premium ? <Sparkles aria-hidden /> : <Lock aria-hidden />}
              {copy.debate.premiumBadge}
            </Badge>
          </div>
          <p className="max-w-prose type-body text-text-secondary">{copy.debate.card.description}</p>
          <p className="type-caption text-text-muted">
            {premium ? copy.debate.card.unlimited : copy.debate.card.locked}
          </p>
        </div>
      </div>

      {premium ? (
        <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
          <Link
            href={`/cursos/${courseId}/debate/historial`}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
          >
            {copy.debate.card.history}
          </Link>
          <Link href={`/cursos/${courseId}/debate`} className={buttonVariants({ size: "lg" })}>
            {copy.debate.card.start}
          </Link>
        </div>
      ) : (
        <Link
          href={`/planes?curso=${encodeURIComponent(courseId)}`}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "md:shrink-0")}
        >
          <Lock aria-hidden />
          {copy.debate.card.seePlans}
        </Link>
      )}
    </Card>
  );
}
