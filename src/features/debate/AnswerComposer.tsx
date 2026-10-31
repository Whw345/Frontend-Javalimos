"use client";

import { Eraser, Mic, MicOff, Repeat2, SkipForward } from "lucide-react";
import type { ClipboardEvent, DragEvent, ReactNode, Ref } from "react";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import { Textarea } from "@/components/ui/Textarea";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import type { InputMode } from "./schema";

interface AnswerComposerProps {
  textareaRef: Ref<HTMLTextAreaElement>;
  text: string;
  maxChars: number;
  preferredMode: InputMode;
  disabled: boolean;
  onTextChange: (text: string) => void;
  onPasteBlocked: () => void;
  dictation: {
    supported: boolean;
    listening: boolean;
    interim: string;
    onToggle: () => void;
  };
  onClear: () => void;
  pass: { confirming: boolean; onRequest: () => void; onConfirm: () => void; onCancel: () => void };
  rephrase: { available: boolean; pending: boolean; onRequest: () => void };
  submit: { pending: boolean; onSubmit: () => void };
  timer: ReactNode;
}

/**
 * Compositor de respuesta (§6.3 del spec). Un solo campo para los dos modos: el dictado
 * escribe dentro del mismo texto, así se alterna entre hablar y escribir en cualquier momento.
 * Pegar y soltar texto están bloqueados.
 */
export function AnswerComposer({
  textareaRef,
  text,
  maxChars,
  preferredMode,
  disabled,
  onTextChange,
  onPasteBlocked,
  dictation,
  onClear,
  pass,
  rephrase,
  submit,
  timer,
}: AnswerComposerProps) {
  const block = (event: ClipboardEvent | DragEvent) => {
    event.preventDefault();
    onPasteBlocked();
  };
  const placeholder =
    preferredMode === "voz" && dictation.supported
      ? copy.debate.screen.placeholderVoice
      : copy.debate.screen.placeholderText;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3 rounded-lg border border-border bg-surface p-4 short:gap-2 lg:p-6 short:lg:p-4">
      <label htmlFor="debate-answer" className="sr-only">
        {copy.debate.screen.composerLabel}
      </label>
      {/* El contenedor del Textarea crece con el panel (el componente no expone su clase). */}
      <div className="flex min-h-0 flex-1 flex-col *:min-h-0 *:flex-1">
        <Textarea
          id="debate-answer"
          ref={textareaRef}
          value={text}
          maxLength={maxChars}
          showCount
          counterLabel={copy.debate.screen.counter}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck
          onChange={(event) => onTextChange(event.target.value)}
          onPaste={block}
          onDrop={block}
          className="min-h-24 flex-1 short:min-h-20"
        />
      </div>

      {/* Lo que se está dictando es contenido del reto: mismo tamaño que el campo (body-lg, §5). */}
      {dictation.listening && (
        <div aria-live="polite" className="flex flex-col gap-1">
          <p className="type-caption text-primary-text">{copy.debate.screen.dictating}</p>
          {dictation.interim && <p className="type-body-lg text-text-muted italic">{dictation.interim}</p>}
        </div>
      )}

      {timer}

      {pass.confirming ? (
        <div className="flex flex-col gap-2 rounded-md bg-surface-raised p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="type-label text-text">{copy.debate.screen.passConfirm}</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={pass.onCancel}>
              {copy.debate.screen.passNo}
            </Button>
            <Button variant="secondary" onClick={pass.onConfirm} autoFocus>
              {copy.debate.screen.passYes}
              <Kbd>P</Kbd>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {dictation.supported && (
              <Button
                variant="secondary"
                aria-pressed={dictation.listening}
                disabled={disabled}
                onClick={dictation.onToggle}
                // Activo = estado "seleccionado" (§7.2), no un segundo botón primario (§9.1).
                className={cn(
                  "flex-1 sm:flex-none",
                  dictation.listening && "border-primary bg-primary-soft shadow-glow-primary",
                )}
              >
                {dictation.listening ? <MicOff aria-hidden /> : <Mic aria-hidden />}
                {dictation.listening ? copy.debate.screen.stopDictation : copy.debate.screen.dictate}
                <Kbd>Espacio</Kbd>
              </Button>
            )}
            <Button variant="ghost" disabled={disabled || text === ""} onClick={onClear}>
              <Eraser aria-hidden />
              {copy.debate.screen.clear}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" disabled={disabled} onClick={pass.onRequest}>
              <SkipForward aria-hidden />
              {copy.debate.screen.pass}
              <Kbd>P</Kbd>
            </Button>
            <Button
              variant="ghost"
              disabled={disabled || !rephrase.available}
              loading={rephrase.pending}
              title={rephrase.available ? undefined : copy.debate.screen.rephraseUsed}
              onClick={rephrase.onRequest}
            >
              <Repeat2 aria-hidden />
              {copy.debate.screen.rephrase}
              <Kbd>R</Kbd>
            </Button>
            <Button
              size="lg"
              className="w-full lg:w-auto lg:min-w-60"
              disabled={disabled || text.trim() === ""}
              loading={submit.pending}
              onClick={submit.onSubmit}
            >
              {copy.debate.screen.submit}
              <Kbd className="border-text-on-primary/30 bg-transparent text-text-on-primary">Ctrl ⏎</Kbd>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
