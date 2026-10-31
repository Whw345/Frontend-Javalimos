"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const NODE_SIZE = 72;
/** Separación entre casillas: abajo de MIN se salta de fila, arriba de MAX queda aire a la derecha. */
const MIN_STEP = 104;
const MAX_STEP = 176;
const WAVE_HEIGHT = 64;
const NODES_PER_WAVE = 4;
/** Nombre y estado bajo la casilla: hasta tres líneas. */
const LABEL_HEIGHT = 76;
const ROW_HEIGHT = WAVE_HEIGHT + NODE_SIZE + LABEL_HEIGHT;

/** Seno desplazado para que la primera casilla quede arriba, donde empieza la fila. */
const waveY = (position: number) =>
  (WAVE_HEIGHT / 2) * (1 - Math.cos((2 * Math.PI * position) / NODES_PER_WAVE));

/** Dónde cayó una casilla, para que pueda abrirse sin salirse del camino. */
export interface PathSlot {
  x: number;
  width: number;
}

function curvePath(nodes: number, step: number, top: number) {
  const points = [];
  for (let position = 0; position <= nodes - 1; position += 1 / 16) {
    const y = top + waveY(position) + NODE_SIZE / 2;
    points.push(`${(position + 0.5) * step} ${y}`);
  }
  return `M${points.join("L")}`;
}

interface SinePathProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string | number;
  label?: string;
  renderNode: (item: T, slot: PathSlot) => ReactNode;
}

/**
 * Camino del docente y del estudiante: va de izquierda a derecha desde arriba a la izquierda,
 * sobre una curva seno. Si las casillas no caben en el ancho disponible, sigue en otra fila.
 */
export function SinePath<T>({ items, getKey, label, renderNode }: SinePathProps<T>) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const columns = Math.max(2, Math.floor(width / MIN_STEP));
  const step = Math.min(MAX_STEP, width / Math.min(columns, Math.max(items.length, 1)));
  const rows = Math.ceil(items.length / columns);
  // La última fila mide lo que baja su ola: con pocas casillas no deja un hueco debajo.
  const lastRowNodes = items.length - (rows - 1) * columns;
  const lastRowWave = Math.max(...Array.from({ length: lastRowNodes }, (_, column) => waveY(column)));
  const height = (rows - 1) * ROW_HEIGHT + lastRowWave + NODE_SIZE + LABEL_HEIGHT;

  return (
    <div ref={container} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <>
          <svg aria-hidden className="absolute inset-0 size-full">
            {Array.from({ length: rows }, (_, row) => (
              <path
                key={row}
                d={curvePath(Math.min(columns, items.length - row * columns), step, row * ROW_HEIGHT)}
                fill="none"
                stroke="var(--color-border-strong)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="2 12"
              />
            ))}
          </svg>
          <ul aria-label={label} className="absolute inset-0">
            {items.map((item, index) => {
              const column = index % columns;
              const x = (column + 0.5) * step;
              const y = Math.floor(index / columns) * ROW_HEIGHT + waveY(column);
              return (
                <li
                  key={getKey(item, index)}
                  style={{ left: x, top: y }}
                  className="absolute flex w-24 -translate-x-1/2 flex-col items-center gap-3 has-[[data-open]]:z-10"
                >
                  {renderNode(item, { x, width })}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
