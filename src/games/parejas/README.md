# Parejas

Juego 2 del catálogo (§12). Une conceptos con sus definiciones.

## Mecánica

- Se toca un concepto y luego una definición (o al revés). El par toma el color + forma + número del concepto; nunca solo color (§14).
- Tocar una ficha ya unida suelta el par y la deja seleccionada, para corregir.
- Teclado: `1`–`5` conceptos, `A`–`E` definiciones.
- En ≥768 px un conector de color une cada par. En móvil los conceptos pasan a chips arriba y las definiciones a una lista debajo (§12, notas).
- Se envía solo al completar todos los pares, tras una pausa de 400 ms para que se vea el último par.
- Pista: el servidor revela un par correcto, que queda fijo (💡) y no se puede soltar.

| Nivel | Pares | Tiempo |
| ----- | ----- | ------ |
| 1     | 3     | 45 s   |
| 2     | 4     | 50 s   |
| 3     | 5     | 50 s   |

## Decisiones fuera del estándar

- **Pista con datos.** `POST /hint` ahora puede devolver `hint` (aquí, `{ conceptId, definitionId }`). El shell lo pasa al juego en `GameProps.hint` y el juego lo valida con `parejasHintSchema`. Pendiente de acordar con backend.
- **Definiciones sin el término.** El backend debe mandar la definición sin el concepto (el mock lo reemplaza por `____`); tras responder, la revisión muestra la definición completa.
- **Cuándo cuenta como correcto** (lo decide el backend; el mock exige todos los pares bien).
- Las definiciones ocupan 3/5 del ancho y los conceptos 2/5: así cada definición usa menos líneas y el nivel 3 cabe sin scroll en 1280 × 720 y 1366 × 650.

## Archivos

- `logic.ts` — selección y formación de pares, pista, revisión. Tests en `logic.test.ts`.
- `schema.ts` — zod para payload, respuesta, solución y pista.
- `Parejas.tsx` — tablero.
- `MatchConnectors.tsx` — líneas SVG entre pares.
- `ParejasReview.tsx` — revisión posterior.
- `fixtures.ts` — datos de ejemplo.
