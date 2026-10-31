# Desliza

Juego 1 del catálogo (§12). Calentamiento de verdadero/falso.

## Mecánica

- Aparece una afirmación por ronda. Derecha = verdadera, izquierda = falsa.
- Tres formas de responder: arrastrar la tarjeta (mouse o táctil), botones ✗ / ✓, o teclado `←` / `→`.
- Superar el 35 % del ancho de la tarjeta confirma. Un _flick_ rápido (≥ 800 px/s) también confirma si ya recorrió el 12 %.
- La tarjeta se inclina hasta 12° y muestra las etiquetas "VERDADERO" / "FALSO" (no solo color).
- Pista: muestra el concepto de cada afirmación ("Tema: Mitosis").

| Nivel | Cartas | Tiempo por carta |
| ----- | ------ | ---------------- |
| 1     | 6      | 8 s              |
| 2     | 8      | 6 s              |
| 3     | 8      | 4 s              |

## Decisiones fuera del estándar

- **Tiempo por ronda.** El contrato original da un solo temporizador por reto. Desliza necesita uno por carta, así que `GameDefinition` ganó `getRounds()` y `GameProps` ganó `round` / `onRoundComplete`. El shell sigue siendo el dueño del tiempo: al agotarse una carta, avanza la ronda y la carta queda sin respuesta (`verdict: null`).
- **Envío.** `submitMode: "auto"`: el shell envía el reto al terminar la última ronda.
- **Revisión.** Tras responder, `DeslizaReview` reemplaza el área de juego con el detalle carta por carta (las tarjetas ya no están en pantalla, así que no hay estados `correct` / `incorrect` sobre ellas).
- **Cuándo cuenta como correcto** (lo decide el backend; el mock usa ≥ 75 % de aciertos). Pendiente de acordar con backend.

## Archivos

- `logic.ts` — lógica pura (umbral de arrastre, inclinación, registro de respuestas, revisión). Con tests en `logic.test.ts`.
- `schema.ts` — zod para payload, respuesta y solución.
- `SwipeCard.tsx` — tarjeta arrastrable (Motion).
- `Desliza.tsx` — área central del juego.
- `DeslizaReview.tsx` — revisión posterior.
- `fixtures.ts` — datos de ejemplo.
