"use client";

import { useId } from "react";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils/cn";
import { DEBATE_DIFFICULTIES, DEBATE_LEVELS } from "./levels";
import type { DebateDifficulty } from "./schema";

interface LevelPickerProps {
  value: DebateDifficulty;
  onChange: (value: DebateDifficulty) => void;
}

/** Selector de nivel con duración, temas y tope por turno visibles (§5 del spec). */
export function LevelPicker({ value, onChange }: LevelPickerProps) {
  const labelId = useId();
  const level = DEBATE_LEVELS[value];

  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="type-label text-text">
        {copy.debate.levels.label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex gap-2">
        {DEBATE_DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            role="radio"
            aria-checked={value === difficulty}
            onClick={() => onChange(difficulty)}
            className={cn(
              "h-11 flex-1 rounded-full border type-label transition-colors duration-(--duration-fast) focus-visible:shadow-glow-primary",
              value === difficulty
                ? "border-primary bg-primary-soft text-text"
                : "border-border text-text-secondary hover:border-border-strong",
            )}
          >
            {copy.debate.levels[difficulty]}
          </button>
        ))}
      </div>
      <p className="type-caption text-text-muted">
        {copy.debate.levels.summary(level.totalSeconds / 60, level.topics, level.turnSeconds)}
      </p>
    </div>
  );
}
