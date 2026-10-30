"use client";

import { Lightbulb } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { CategoryMark } from "@/components/game/CategoryMark";
import { GameTile, type GameTileState } from "@/components/game/GameTile";
import { copy } from "@/content/copy";
import { useGameHotkeys, type HotkeyMap } from "@/lib/hooks/useGameHotkeys";
import { DURATION } from "@/styles/motion";
import type { GameProps } from "../types";
import {
  EMPTY_BOARD,
  conceptIndex,
  findPair,
  isBoardComplete,
  selectTile,
  toAnswer,
  withHint,
  type BoardState,
  type Side,
} from "./logic";
import { MatchConnectors } from "./MatchConnectors";
import { parejasHintSchema, type Pair, type ParejasAnswer, type ParejasPayload } from "./schema";

const t = copy.games.parejas;
const DEFINITION_KEYS = ["a", "b", "c", "d", "e"] as const;

/** Pausa breve tras el último par para que se vea antes de enviarse solo. */
const AUTO_SUBMIT_DELAY_MS = DURATION.slow * 1000;

/**
 * Parejas: tocar un concepto y luego una definición (o al revés) los une con el
 * color + forma del concepto. Se envía solo al completar todos los pares.
 */
export function Parejas({
  payload,
  disabled,
  hint,
  onAnswerChange,
  onSubmit,
}: GameProps<ParejasPayload, ParejasAnswer>) {
  const [board, setBoard] = useState<BoardState>(EMPTY_BOARD);
  const boardRef = useRef<HTMLDivElement>(null);
  const tiles = useRef(new Map<string, HTMLElement>());

  const hintPair = useMemo<Pair | null>(() => {
    const parsed = parejasHintSchema.safeParse(hint);
    return parsed.success ? parsed.data : null;
  }, [hint]);

  const pairs = useMemo(() => withHint(board.pairs, hintPair), [board.pairs, hintPair]);
  const isHinted = (side: Side, id: string) =>
    hintPair !== null && (side === "concept" ? hintPair.conceptId : hintPair.definitionId) === id;
  // Si la pista fija una ficha que estaba seleccionada, la selección deja de valer.
  const selection =
    board.selection && !isHinted(board.selection.side, board.selection.id) ? board.selection : null;

  const report = useEffectEvent((current: Pair[]) => {
    onAnswerChange(toAnswer(current), isBoardComplete(current, payload));
  });
  const submit = useEffectEvent((current: Pair[]) => onSubmit(toAnswer(current)));

  useEffect(() => {
    report(pairs);
    if (!isBoardComplete(pairs, payload)) return;
    const id = window.setTimeout(() => submit(pairs), AUTO_SUBMIT_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [pairs, payload]);

  const toggle = (side: Side, id: string) => {
    if (disabled) return;
    setBoard((current) => {
      // Los pares del estudiante nunca incluyen las fichas que fijó la pista.
      const freePairs = hintPair ? withHint(current.pairs, hintPair).slice(1) : current.pairs;
      const freeSelection =
        current.selection && !isHinted(current.selection.side, current.selection.id)
          ? current.selection
          : null;
      return selectTile({ pairs: freePairs, selection: freeSelection }, side, id, hintPair);
    });
  };

  const hotkeys: HotkeyMap = {};
  payload.concepts.forEach((concept, index) => {
    hotkeys[String(index + 1)] = () => toggle("concept", concept.id);
  });
  payload.definitions.forEach((definition, index) => {
    const key = DEFINITION_KEYS[index];
    if (key) hotkeys[key] = () => toggle("definition", definition.id);
  });
  useGameHotkeys(hotkeys, { enabled: !disabled });

  const registerTile = (side: Side, id: string) => (node: HTMLElement | null) => {
    if (node) tiles.current.set(`${side}:${id}`, node);
    else tiles.current.delete(`${side}:${id}`);
  };

  const tileState = (side: Side, id: string): GameTileState => {
    if (selection?.side === side && selection.id === id) return "selected";
    return findPair(pairs, side, id) ? "matched" : "idle";
  };

  const markFor = (conceptId: string) => {
    const index = conceptIndex(payload, conceptId);
    return { index, label: String(index + 1) };
  };

  const ariaFor = (side: Side, id: string, text: string) => {
    if (isHinted(side, id)) return t.tileAria(text, "hint");
    const state = tileState(side, id);
    if (state === "selected") return t.tileAria(text, "selected");
    const pair = findPair(pairs, side, id);
    if (!pair) return t.tileAria(text, "free");
    const partner =
      side === "concept"
        ? payload.definitions.find((d) => d.id === pair.definitionId)?.text
        : payload.concepts.find((c) => c.id === pair.conceptId)?.text;
    return t.tileAria(text, "paired", partner);
  };

  return (
    <div className="flex h-full min-h-0 flex-col py-2">
      <div
        ref={boardRef}
        // Definiciones más anchas que conceptos: menos líneas por ficha y el tablero cabe sin scroll.
        className="relative grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain md:grid-cols-[minmax(0,2fr)_3rem_minmax(0,3fr)] md:gap-x-0 lg:grid-cols-[minmax(0,2fr)_4rem_minmax(0,3fr)]"
      >
        {/* El contador va en la columna de conceptos, que es más corta: no le roba alto a las definiciones. */}
        <div className="flex flex-col gap-3 md:col-start-1 md:self-center">
          <p className="type-caption text-text-muted tabular-nums" aria-live="polite">
            {t.progress(pairs.length, payload.concepts.length)}
          </p>
          <ul aria-label={t.concepts} className="flex flex-wrap gap-2 md:flex-col md:gap-3">
            {payload.concepts.map((concept, index) => {
              const hinted = isHinted("concept", concept.id);
              return (
                <li key={concept.id} className="md:w-full">
                  <GameTile
                    ref={registerTile("concept", concept.id)}
                    state={tileState("concept", concept.id)}
                    category={index}
                    shortcut={String(index + 1)}
                    disabled={disabled}
                    aria-disabled={hinted || undefined}
                    aria-label={ariaFor("concept", concept.id, concept.text)}
                    onClick={() => toggle("concept", concept.id)}
                    leading={<CategoryMark index={index} label={String(index + 1)} />}
                    // En móvil los conceptos son chips: 44 px de alto mínimo táctil (§14).
                    className="min-h-11 w-auto px-3 py-2 md:w-full"
                  >
                    {concept.text}
                  </GameTile>
                </li>
              );
            })}
          </ul>
        </div>

        <ul aria-label={t.definitions} className="flex flex-col gap-2 md:col-start-3 md:row-start-1">
          {payload.definitions.map((definition, index) => {
            const pair = findPair(pairs, "definition", definition.id);
            const mark = pair ? markFor(pair.conceptId) : null;
            const hinted = isHinted("definition", definition.id);
            return (
              <li key={definition.id}>
                <GameTile
                  ref={registerTile("definition", definition.id)}
                  state={tileState("definition", definition.id)}
                  category={mark?.index}
                  shortcut={DEFINITION_KEYS[index]?.toUpperCase()}
                  disabled={disabled}
                  aria-disabled={hinted || undefined}
                  aria-label={ariaFor("definition", definition.id, definition.text)}
                  onClick={() => toggle("definition", definition.id)}
                  className="py-2.5 lg:py-3 short:lg:py-2"
                  leading={
                    mark ? (
                      <span className="flex shrink-0 flex-col items-center gap-1">
                        <CategoryMark index={mark.index} label={mark.label} />
                        {hinted && <Lightbulb aria-label={t.hintPinned} className="size-4 text-info" />}
                      </span>
                    ) : (
                      <span
                        aria-hidden
                        className="size-6 shrink-0 rounded-sm border border-dashed border-border"
                      />
                    )
                  }
                >
                  {definition.text}
                </GameTile>
              </li>
            );
          })}
        </ul>

        <MatchConnectors
          containerRef={boardRef}
          pairs={pairs}
          getTile={(side, id) => tiles.current.get(`${side}:${id}`)}
          categoryFor={(conceptId) => conceptIndex(payload, conceptId)}
        />
      </div>
    </div>
  );
}
