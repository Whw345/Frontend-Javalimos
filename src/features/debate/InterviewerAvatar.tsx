import { MessagesSquare } from "lucide-react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";

interface InterviewerAvatarProps {
  state: "idle" | "speaking" | "thinking";
}

/**
 * Identidad del entrevistador (§6.4 del spec): avatar abstracto, sin cuy, porque aparece
 * mientras corre el temporizador. El estado se anuncia por texto, no solo con la animación.
 */
export function InterviewerAvatar({ state }: InterviewerAvatarProps) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary [&_svg]:size-6"
      >
        <MessagesSquare />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="type-label text-text">{copy.debate.screen.interviewer}</p>
        <p aria-live="polite" className="flex h-4 items-center gap-2 type-caption text-text-muted">
          {state === "speaking" && (
            <>
              <span aria-hidden className="flex h-3 items-end gap-0.5 motion-reduce:hidden">
                {[0, 1, 2].map((bar) => (
                  <span
                    key={bar}
                    className="w-0.5 rounded-full bg-primary motion-safe:animate-voice-bar"
                    style={{ animationDelay: `calc(var(--stagger) * ${bar})` }}
                  />
                ))}
              </span>
              {copy.debate.screen.speaking}
            </>
          )}
          {state === "thinking" && (
            <>
              <span aria-hidden className="flex gap-1 motion-reduce:hidden">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className={cn("size-1 rounded-full bg-text-muted motion-safe:animate-timer-pulse")}
                    style={{ animationDelay: `calc(var(--stagger) * ${dot})` }}
                  />
                ))}
              </span>
              {copy.debate.screen.thinking}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
