"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, useState } from "react";
import { GameTile } from "@/components/game/GameTile";
import { TextHint } from "@/components/game/TextHint";
import { Input } from "@/components/ui/Input";
import { copy } from "@/content/copy";
import { useGameHotkeys, type HotkeyMap } from "@/lib/hooks/useGameHotkeys";
import { DURATION, EASE } from "@/styles/motion";
import type { GameProps } from "../types";
import { hasAnswer, visibleClues } from "./logic";
import type { QuienSoyAnswer, QuienSoyPayload } from "./schema";

const t = copy.games.quienSoy;

/**
 * ¿Quién soy?: cada ronda del shell revela una pista más. Se puede responder
 * en cualquier momento con "Comprobar" (o Enter); al acabar la última pista se envía solo.
 */
export function QuienSoy({
  payload,
  disabled,
  hint,
  onAnswerChange,
  onSubmit,
  round,
}: GameProps<QuienSoyPayload, QuienSoyAnswer>) {
  const reduceMotion = useReducedMotion();
  const [optionId, setOptionId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const clues = visibleClues(payload, round);

  const buildAnswer = (): QuienSoyAnswer => ({
    optionId,
    text: payload.mode === "text" ? text : null,
    cluesSeen: clues.length,
  });

  const report = useEffectEvent(() => {
    const answer = buildAnswer();
    onAnswerChange(answer, hasAnswer(answer));
  });
  useEffect(() => report(), [optionId, text, clues.length]);

  const choose = (id: string) => {
    if (!disabled) setOptionId((current) => (current === id ? null : id));
  };

  const hotkeys: HotkeyMap = {};
  if (payload.mode === "options") {
    payload.options.forEach((option, index) => {
      hotkeys[String(index + 1)] = () => choose(option.id);
    });
  }
  useGameHotkeys(hotkeys, { enabled: !disabled });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 py-2">
      <TextHint hint={hint} />
      <ol
        aria-label={t.cluesLabel}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
      >
        <AnimatePresence initial={false}>
          {clues.map((clue, index) => (
            <motion.li
              key={index}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: DURATION.base, ease: EASE.out }}
              className="flex items-start gap-3 rounded-lg border border-border bg-surface-raised px-4 py-3"
            >
              <span className="shrink-0 rounded-sm bg-info/15 px-2 py-0.5 type-caption text-info">
                {t.clue(index + 1)}
              </span>
              <p className="type-body-lg text-text">{clue}</p>
            </motion.li>
          ))}
        </AnimatePresence>
        {clues.length < payload.clues.length && (
          <li aria-hidden className="px-4 type-caption text-text-muted">
            {t.nextClueSoon}
          </li>
        )}
      </ol>

      {payload.mode === "options" ? (
        <ul aria-label={t.optionsLabel} className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          {payload.options.map((option, index) => (
            <li key={option.id}>
              <GameTile
                state={optionId === option.id ? "selected" : "idle"}
                shortcut={String(index + 1)}
                disabled={disabled}
                aria-pressed={optionId === option.id}
                onClick={() => choose(option.id)}
              >
                {option.text}
              </GameTile>
            </li>
          ))}
        </ul>
      ) : (
        <label className="flex shrink-0 flex-col gap-2">
          <span className="type-label text-text-secondary">{t.inputLabel}</span>
          <Input
            value={text}
            maxLength={80}
            disabled={disabled}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={t.inputPlaceholder}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && text.trim() !== "") {
                event.preventDefault();
                onSubmit(buildAnswer());
              }
            }}
          />
        </label>
      )}
    </div>
  );
}
