import { Lightbulb } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils/cn";

/** Pista genérica que envía el servidor: una frase que orienta sin dar la respuesta. */
export const textHintSchema = z.object({ text: z.string().min(1) });

interface TextHintProps {
  hint: unknown;
  className?: string;
}

/** Muestra la pista de texto si el servidor la envió; si no, no renderiza nada. */
export function TextHint({ hint, className }: TextHintProps) {
  const parsed = textHintSchema.safeParse(hint);
  if (!parsed.success) return null;
  return (
    <p className={cn("flex items-start gap-2 type-body text-info", className)}>
      <Lightbulb aria-hidden className="mt-0.5 size-4 shrink-0" />
      {parsed.data.text}
    </p>
  );
}
