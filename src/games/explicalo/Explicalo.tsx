"use client";

import { useEffect, useEffectEvent, useId, useState } from "react";
import { TextHint } from "@/components/game/TextHint";
import { Textarea } from "@/components/ui/Textarea";
import { copy } from "@/content/copy";
import type { GameProps } from "../types";
import { canSubmit, clampText, isSubmitShortcut } from "./logic";
import type { ExplicaloAnswer, ExplicaloPayload } from "./schema";

const t = copy.games.explicalo;

/** Explícalo en una frase: el estudiante escribe; el backend evalúa después (nunca durante). */
export function Explicalo({
  payload,
  disabled,
  hint,
  onAnswerChange,
  onSubmit,
}: GameProps<ExplicaloPayload, ExplicaloAnswer>) {
  const [text, setText] = useState("");
  const inputId = useId();

  const report = useEffectEvent((value: string) => onAnswerChange({ text: value }, canSubmit(value)));
  useEffect(() => report(text), [text]);

  return (
    <div className="flex h-full flex-col justify-center gap-4 py-2">
      <TextHint hint={hint} />
      <p className="type-h2 text-text">
        <span className="text-text-muted">{t.conceptLabel} </span>
        {payload.concept}
      </p>
      <label htmlFor={inputId} className="type-label text-text-secondary">
        {t.inputLabel}
      </label>
      <Textarea
        id={inputId}
        value={text}
        maxLength={payload.maxChars}
        disabled={disabled}
        autoFocus
        spellCheck={false}
        placeholder={t.placeholder}
        showCount
        counterLabel={t.counter}
        onChange={(event) => setText(clampText(event.target.value, payload.maxChars))}
        onKeyDown={(event) => {
          if (isSubmitShortcut(event) && canSubmit(text)) {
            event.preventDefault();
            onSubmit({ text });
          }
        }}
      />
    </div>
  );
}
