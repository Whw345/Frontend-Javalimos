# Modo Debate (premium)

Entrevistador socrático + mediador. Spec completo: `.plans/debate-socratico-spec.md`.

No es un minijuego del `gameRegistry`: es un modo aparte, de varios turnos, que no da puntos ni consume los 10 retos semanales. Reutiliza `GameTimer`, `ConfirmDialog`, `Textarea`, `useCountdown` y `useGameHotkeys`.

## Flujo y rutas

| Ruta                                  | Pantalla                                                                       |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `/cursos/[courseId]/jugar`            | `DebatePremiumCard` sobre la grilla de minijuegos (con plan o bloqueada)       |
| `/cursos/[courseId]/debate`           | `DebateIntro`: temas elegidos por el sistema, nivel, modo de respuesta, reglas |
| `/debate/[debateId]?modo=voz\|texto`  | `DebateScreen`: pregunta, compositor, reloj global + tope por turno, historial |
| `/debate/[debateId]/informe`          | `DebateReport`: espera del mediador (poll) y luego el informe                  |
| `/cursos/[courseId]/debate/historial` | `DebateHistoryList`                                                            |
| `/planes`                             | Gratis vs Premium, sin pagos                                                   |

## Decisiones

- **Texto como fuente de verdad.** La voz es dictado (`useDictation`, Web Speech API `es-PE`) que escribe en el mismo `Textarea`; se puede corregir antes de enviar y alternar con el teclado en cualquier momento. Con `NEXT_PUBLIC_DEBATE_SEND_AUDIO=true` el audio del turno viaja además como multipart para que el backend lo re-transcriba.
- **El servidor es dueño del tiempo.** Cada respuesta del API trae el `deadline` recalculado (descuenta lo que el entrevistador "pensó"); el cliente pausa el reloj global mientras espera. El tope por turno se mide en el cliente y el servidor lo valida con `durationMs`.
- **Sin pistas.** El historial durante el debate solo dice respondida / pasada / reformulada. La calidad aparece recién en el informe.
- **Antitrampa:** pegar y soltar texto se bloquean y se registran; los cambios de pestaña se registran (`POST /events`) sin cortar el debate.
- **Avisos con `Toast`** (§9.3, `components/ui/Toast.tsx`): pegado bloqueado, fin del turno, micrófono negado y error de envío.
- **Tope por turno en color `timer` fijo**; la urgencia se ve con barra más gruesa, pulso y anuncio. El reloj global (`GameTimer`) sigue la misma regla.
- **Cuy frontal** solo en intro, espera del mediador, informe e historial vacío; el entrevistador usa un avatar abstracto porque aparece con el reloj corriendo. `CuyFrontal` es una ilustración provisional hasta exportar los SVG de la marca.

## Mock

`src/mocks/debate.ts` sustituye a los dos LLM: arma preguntas eje que cruzan dos temas (rotando para cubrirlos todos), repregunta si la respuesta es corta, no conecta los temas o no da una causa (máx. 2 seguidas), y evalúa con heurísticas por ideas clave y confusiones típicas de los átomos. Los temas salen de la semana actual + semanas 3–4 (`biologyEarlierWeeksAtoms`). Todo curso es Premium salvo los que tengan `gratis` en el id (p. ej. `/cursos/gratis-101/jugar`).

Para probarlo: `NEXT_PUBLIC_API_MOCKING=enabled`. Con el backend real, la tarjeta del Debate no aparece hasta que existan los endpoints de `src/lib/api/debate.ts`.

## Pendiente

- Ajuste de tiempo ×1.5 por accesibilidad (no existe todavía la configuración por estudiante).
- TTS del servidor (`audioUrl`) y re-transcripción del audio: backend.
- Vista docente con agregados anónimos.
