"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { copy } from "@/content/copy";

const NODE_SIZE = 72;
const WEEK_CARD_WIDTH = 256;
const STEP = 132;
/** Del centro de la tarjeta a la primera casilla: nunca queda debajo de la tarjeta. */
const CARD_GAP = WEEK_CARD_WIDTH / 2 + NODE_SIZE / 2 + 8;
/** Alto reservado arriba para las tarjetas de semana, que se apoyan en la cresta. */
const CREST_Y = 156;
const WAVE_HEIGHT = 220;
/** Deja sitio para abrir una casilla del valle: el scroll horizontal recorta lo que sale por abajo. */
const TRACK_HEIGHT = 544;

export interface PathSegment<T> {
  key: string | number;
  label: string;
  card: ReactNode;
  items: T[];
  itemsLabel?: string;
}

interface SinePathProps<T> {
  segments: PathSegment<T>[];
  getKey: (item: T, index: number) => string | number;
  renderNode: (item: T) => ReactNode;
  /** Semana a la que abre el camino. */
  startAt?: string | number;
}

/** Una ola por semana: de la cresta bajo su tarjeta a la cresta bajo la tarjeta siguiente. */
const segmentLength = (items: number) =>
  items > 0 ? 2 * CARD_GAP + (items - 1) * STEP : WEEK_CARD_WIDTH + 48;
const nodeOffset = (index: number) => CARD_GAP + index * STEP;
const waveY = (offset: number, length: number) =>
  CREST_Y + (WAVE_HEIGHT / 2) * (1 - Math.cos((2 * Math.PI * offset) / length));

/** La última semana termina en su última casilla; las demás, bajo la tarjeta siguiente. */
function placeSegments<T>(segments: PathSegment<T>[]) {
  let center = WEEK_CARD_WIDTH / 2;
  return segments.map((segment, index) => {
    const length = segmentLength(segment.items.length);
    const lastNode = segment.items.length ? nodeOffset(segment.items.length - 1) : 0;
    const placed = { segment, center, length, end: index < segments.length - 1 ? length : lastNode };
    center += length;
    return placed;
  });
}

function curvePath(segments: { center: number; length: number; end: number }[]) {
  const points = segments.flatMap(({ center, length, end }) => {
    const samples = [];
    for (let offset = 0; offset < end; offset += 8) {
      samples.push(`${center + offset} ${waveY(offset, length)}`);
    }
    samples.push(`${center + end} ${waveY(end, length)}`);
    return samples;
  });
  return `M${points.join("L")}`;
}

/**
 * Camino único del curso, del docente y del estudiante: nace arriba a la izquierda y sigue una
 * curva seno hacia la derecha, pasando por la tarjeta de cada semana y luego por sus juegos.
 */
export function SinePath<T>({ segments, getKey, renderNode, startAt }: SinePathProps<T>) {
  const scroller = useRef<HTMLDivElement>(null);
  const placed = placeSegments(segments);
  const last = placed.at(-1);
  const width = last ? last.center + last.end + WEEK_CARD_WIDTH / 2 : WEEK_CARD_WIDTH;
  const startCenter = placed.find(({ segment }) => segment.key === startAt)?.center;

  useEffect(() => {
    if (startCenter === undefined) return;
    scroller.current?.scrollTo({ left: startCenter - WEEK_CARD_WIDTH / 2 });
  }, [startCenter]);

  return (
    <div
      ref={scroller}
      data-path-scroller
      role="region"
      aria-label={copy.common.pathLabel}
      tabIndex={0}
      className="-mx-4 overflow-x-auto px-4 focus-visible:outline-2 focus-visible:outline-primary md:-mx-6 md:px-6 lg:-mx-8 lg:px-8"
    >
      <div className="relative" style={{ width, height: TRACK_HEIGHT }}>
        {placed.length > 0 && (
          <svg aria-hidden className="absolute inset-0 size-full">
            <path
              d={curvePath(placed)}
              fill="none"
              stroke="var(--color-border-strong)"
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="2 12"
            />
          </svg>
        )}
        {placed.map(({ segment, center: cardCenter, length }) => (
          <section key={segment.key} aria-label={segment.label}>
            <div
              style={{
                left: cardCenter - WEEK_CARD_WIDTH / 2,
                bottom: TRACK_HEIGHT - CREST_Y,
                width: WEEK_CARD_WIDTH,
              }}
              className="absolute"
            >
              {segment.card}
            </div>
            <ul aria-label={segment.itemsLabel}>
              {segment.items.map((item, index) => (
                <li
                  key={getKey(item, index)}
                  style={{
                    left: cardCenter + nodeOffset(index),
                    top: waveY(nodeOffset(index), length) - NODE_SIZE / 2,
                  }}
                  className="absolute flex w-24 -translate-x-1/2 flex-col items-center gap-3 has-[[data-open]]:z-10"
                >
                  {renderNode(item)}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
