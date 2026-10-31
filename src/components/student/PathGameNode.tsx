"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { nodeAccents, nodeFills } from "@/components/game/pathStyle";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { getGameDefinition } from "@/games/registry";
import type { PathGame } from "@/lib/api/schemas";
import { cn } from "@/lib/utils/cn";
import { DURATION, EASE } from "@/styles/motion";

const t = copy.practice;

const NODE_SIZE = 72;
const CARD_WIDTH = 240;
const CARD_MARGIN = 8;

/** Dónde quedó la casilla dentro del tramo visible del camino, que se desplaza. */
interface PathSlot {
  x: number;
  width: number;
}

/** Se abre hacia el centro de lo visible; si aun así no cabe, se corre lo justo. */
function cardShift({ x, width }: PathSlot) {
  if (x > width / 2) return Math.max(0, CARD_MARGIN + CARD_WIDTH - NODE_SIZE / 2 - x);
  return Math.min(0, width - CARD_MARGIN - (x - NODE_SIZE / 2 + CARD_WIDTH));
}

interface PathGameNodeProps {
  game: PathGame;
  weekNumber: number;
  open: boolean;
  limitReached: boolean;
  disabled: boolean;
  loading: boolean;
  onOpen: () => void;
  onClose: () => void;
  onPlay: () => void;
}

/**
 * Casilla del camino. Al pasar el cursor, enfocarla o tocarla se abre y muestra qué es el juego.
 * El reto solo empieza con "Jugar": un toque en el teléfono no debe gastar el intento.
 */
export function PathGameNode({
  game,
  weekNumber,
  open,
  limitReached,
  disabled,
  loading,
  onOpen,
  onClose,
  onPlay,
}: PathGameNodeProps) {
  const reduceMotion = useReducedMotion();
  const [slot, setSlot] = useState<PathSlot>({ x: 0, width: 0 });
  const definition = getGameDefinition(game.game);
  if (!definition) return null;
  const Icon = definition.icon;
  const opensLeft = slot.x > slot.width / 2;
  const openFrom = (node: HTMLElement) => {
    if (open) return;
    const visible = node.closest("[data-path-scroller]")!.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    setSlot({ x: box.left + NODE_SIZE / 2 - visible.left, width: visible.width });
    onOpen();
  };
  const played = game.status === "played";
  const status = played
    ? t.played(game.points ?? 0)
    : game.status === "missed"
      ? t.missed
      : copy.picker.levelOption(game.difficulty);

  return (
    <>
      <div className="relative size-18">
        <motion.div
          data-open={open || undefined}
          initial={false}
          animate={{
            width: open ? CARD_WIDTH : NODE_SIZE,
            height: open ? "auto" : NODE_SIZE,
            x: open ? cardShift(slot) : 0,
            borderRadius: open ? 20 : NODE_SIZE / 2,
          }}
          transition={{ duration: reduceMotion ? 0 : DURATION.base, ease: EASE.out }}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") openFrom(event.currentTarget);
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") onClose();
          }}
          onFocus={(event) => openFrom(event.currentTarget)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) onClose();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          className={cn(
            "absolute top-0 flex overflow-hidden",
            opensLeft ? "right-0 justify-end" : "left-0",
            open ? "bg-surface-raised shadow-lg ring-1 ring-border-strong" : nodeAccents[definition.accent],
            played && "ring-3 ring-success",
            !open && game.status === "missed" && "opacity-50 saturate-50",
          )}
        >
          <div style={{ width: CARD_WIDTH }} className="shrink-0">
            <div className={cn("flex items-center gap-3", opensLeft && "flex-row-reverse text-right")}>
              <button
                type="button"
                aria-label={t.gameLabel(definition.name, weekNumber)}
                aria-expanded={open}
                onClick={(event) => openFrom(event.currentTarget)}
                className={cn(
                  "relative flex size-18 shrink-0 items-center justify-center rounded-full text-text-on-primary",
                  "focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-text-on-primary",
                  nodeFills[definition.accent],
                )}
              >
                <Icon aria-hidden className="size-8" />
                {played && (
                  <span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-surface text-success">
                    <Check aria-hidden className="size-3.5" />
                  </span>
                )}
              </button>
              <div className={cn("min-w-0", opensLeft ? "pl-3" : "pr-3")}>
                <h3 className="type-label text-text">{definition.name}</h3>
                <p className="type-caption text-text-muted">{copy.picker.levelOption(game.difficulty)}</p>
              </div>
            </div>
            <div inert={!open} className="flex flex-col gap-3 p-3 pt-2">
              <p className="type-caption text-text-secondary">{definition.description}</p>
              {game.status === "available" ? (
                <Button
                  className="w-full"
                  disabled={limitReached || disabled}
                  loading={loading}
                  onClick={onPlay}
                >
                  {limitReached ? copy.picker.weeklyLimitReached : copy.picker.play}
                </Button>
              ) : (
                <p className="type-label text-text-secondary">{status}</p>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      <span className="w-full text-center type-caption text-text-secondary">
        {definition.name}
        <span className="block text-text-muted">{status}</span>
      </span>
    </>
  );
}
