# Spec: Modo Debate (entrevistador socrático + mediador)

> Estado: implementado con mock (rama `ramaWilliv2`) · Fecha: 30/10/2026 · Autor: William (entrevista con Claude)
> Notas de implementación y diferencias con este spec: §18.
> Base: `FRONTEND_DESIGN_SYSTEM.md` v0.3, `Contexto.docx` ("debate tipo entrevista para la capa premium"), `Benchmark Prompteado.docx`, rama `ramaWilli` (juegos, `GameShell`, MSW).

---

## 1. Resumen

El **Modo Debate** es una función **premium** en la que un **entrevistador socrático** (LLM) hace preguntas que obligan al estudiante a **conectar varios temas** del curso a la vez, como en un examen oral o una sustentación. El estudiante responde **escribiendo o dictando por voz** (la voz se transcribe a texto editable antes de enviar). Un **temporizador global** limita el debate. Al terminar, un **mediador** (LLM) entrega un informe: rúbrica por criterio, qué hizo bien, qué mejorar, errores con su fuente y el transcript anotado.

- **No da puntos ni afecta el leaderboard.** Su objetivo es preparar para evaluaciones académicas reales.
- **Ilimitado:** no consume los 10 retos semanales y se puede repetir las veces que se quiera.
- **Sin pistas:** el entrevistador nunca da la respuesta ni insinúa si vas bien; el mediador es invisible hasta el final.

### 1.1 Cómo se reconcilia con el design system

El Debate rompe a propósito dos reglas de los minijuegos: "la IA se apaga durante el reto" (§2.1) y "un reto dura 20–90 s" (§1.2). Se justifica así: **la IA no ayuda, examina** (es el rival, no el asistente) y el Debate **no es un minijuego**, es un modo aparte con sus propias reglas. Esta excepción se documenta en el design system (ver §14 de este spec).

---

## 2. Decisiones tomadas en la entrevista

| # | Tema | Decisión |
| --- | --- | --- |
| 1 | Encaje en el producto | **Capa premium** de pago. Disponible si el curso/usuario tiene un plan de pago (no necesariamente un plan universitario: puede ser compra individual). |
| 2 | Alcance de la IA | **Mock + contrato.** Entrevistador y mediador simulados en MSW; contrato de API definido para que backend (Sebas/Juan Diego) conecte el LLM real. Nada de código de servidor en este repo. |
| 3 | Base de código | Partir de la implementación de `ramaWilli` (shell, UI kit, MSW, copy) en una rama nueva `feat/debate`. |
| 4 | Convenciones | El Debate sigue el markdown v0.3 (`snake_case`, `difficulty: "baja" \| "media" \| "alta"`). Solo se ajustan las piezas compartidas que el Debate toca. La migración de los 10 juegos a v0.3 es una tarea aparte. |
| 5 | Rol de la IA | **Entrevistador socrático**: no defiende postura, hace preguntas cada vez más profundas que obligan a relacionar temas. |
| 6 | Temas | **Los elige el sistema** (tema de la semana actual + temas de semanas anteriores, como examen acumulativo). Se **revelan en la intro**, sin opción de cambiarlos. |
| 7 | Entrada de voz | **Dictado → texto editable.** La voz sirve principalmente para transcribir. Contrato **híbrido**: el texto es la fuente de verdad y el audio es opcional (detrás de un flag) para que el backend pueda re-transcribir. |
| 8 | Alternar modo | Se puede alternar **voz ↔ escrito en cualquier momento**, dentro del mismo turno. |
| 9 | Regrabar | **Sin límite**, dentro del tope del turno. |
| 10 | Voz del entrevistador | **Voz + texto siempre**: cada pregunta se muestra escrita y se lee en voz alta (silenciable). |
| 11 | Turnos | **Temporizador global + tope por turno.** El reloj global **se pausa** mientras el entrevistador "piensa". |
| 12 | Fin del tiempo | Lo escrito/dictado hasta ese momento **se envía como última respuesta** y se pasa directo al mediador. |
| 13 | Mediador | **Invisible hasta el final** (solo un indicador "El mediador está tomando nota"). |
| 14 | Rúbrica | 4 criterios con nota 0–4: precisión conceptual, integración de temas, solidez argumentativa, respuesta a la repregunta. |
| 15 | Métricas | Preguntas respondidas / pasadas / total y tiempo promedio de respuesta se muestran como **estadísticas aparte**, no entran a la nota. |
| 16 | Informe | Rúbrica + veredicto, "Lo que hiciste bien" y "Para mejorar" **dentro de cada criterio**, errores con fuente, transcript anotado. Sin enlaces a minijuegos. |
| 17 | Puntos | **No da puntos.** Solo nota de rúbrica y estrellas informativas. |
| 18 | Controles | Pasar pregunta, pedir que reformule (máx. 1 por pregunta), terminar antes, repetir audio. |
| 19 | Antitrampa | **Bloquear pegar/soltar texto + registrar** intentos de pegado y cambios de pestaña (sin cortar el debate). |
| 20 | Dificultad | Cambia **duración total, cantidad de temas y tope por turno** (§5). |
| 21 | Navegadores sin dictado | **Cae a modo escrito con aviso** en la intro (Firefox, micrófono denegado). |
| 22 | Identidad visual | Entrevistador **sin cuy** (avatar abstracto). El cuy frontal aparece solo en la intro, la espera del mediador y el informe. |
| 23 | Layout desktop | **Pregunta al centro + historial** en panel lateral colapsable. |
| 24 | Salir a mitad | Dialog con dos opciones: "Terminar y ver evaluación" o "Salir sin evaluación". |
| 25 | Historial | El estudiante ve sus debates pasados y reabre cada informe. El docente solo verá agregados anónimos (fuera de alcance en v1). |
| 26 | Usuario sin plan | Tarjeta con candado + botón "Ver planes" → página `/planes` (Gratis vs Premium, CTA "Próximamente", sin pagos reales). |

---

## 3. Flujo del estudiante

```
/cursos/[courseId]/jugar ──▶ Tarjeta "Debate" (premium)
        │                         │ sin plan → /planes
        ▼                         ▼ con plan
/cursos/[courseId]/debate  (Intro: temas, duración, nivel, modo de respuesta, permiso de micrófono)
        │  "Empezar debate"
        ▼
/debate/[debateId]         (Debate en curso: pregunta → respuesta → repregunta …)
        │  tiempo = 0 · "Terminar debate" · Esc → "Terminar y ver evaluación"
        ▼
/debate/[debateId]         (Estado "El mediador está evaluando…", cuy frontal esperando)
        ▼
/debate/[debateId]/informe (Informe del mediador)
        │
        ├─▶ "Otro debate"   → nueva intro
        └─▶ "Mis debates"   → /cursos/[courseId]/debate/historial
```

### 3.1 Intro (`/cursos/[courseId]/debate`)

Fuera del temporizador, así que aquí sí puede aparecer el cuy frontal (§3.2 del DS).

1. Cuy frontal (expresión "invitando") + título "Debate" + subtítulo "Te harán preguntas que conectan varios temas. Sin pistas."
2. **Temas de hoy** (los elige el sistema, solo lectura): chips con el nombre del tema y su semana, ej. `Mitosis · S5` `Meiosis · S5` `Ciclo celular · S4`.
3. **Nivel**: selector `Baja / Media / Alta` con su duración, cantidad de temas y tope por turno visibles (§5). Al cambiar el nivel, el servidor vuelve a elegir los temas (la cantidad cambia).
4. **Cómo quieres responder**: `Hablar` (por defecto si hay soporte) / `Escribir`. Se puede cambiar durante el debate.
   - Sin soporte de dictado o micrófono denegado: aviso `warning` "Tu navegador no permite dictado; responderás escribiendo." y `Hablar` deshabilitado.
   - Al elegir `Hablar` se pide el permiso del micrófono **aquí**, no a mitad del debate.
5. **Reglas** en 3 líneas: "Sin pistas", "Pegar texto está desactivado", "Al final, el mediador evalúa tus respuestas".
6. Botón primario "Empezar debate" (`Enter`).

### 3.2 Debate en curso (`/debate/[debateId]`)

Sin navegación global (§6.2). El cuy **no** aparece.

**Ciclo de un turno**

1. El entrevistador muestra la pregunta (escrita) y la lee en voz alta (`speechSynthesis`, `es-PE`), salvo que esté silenciado.
2. El tope del turno empieza a correr cuando la pregunta termina de mostrarse (no espera a que termine el audio, para no castigar a quien lee rápido).
3. El estudiante compone su respuesta en el **compositor** (§6.3): escribe, dicta o combina ambos.
4. Envía con "Responder" (`Ctrl/⌘+Enter`). También puede "Pasar" o "Reformular".
5. Mientras el entrevistador procesa: indicador "Pensando…", reloj global **pausado**, compositor deshabilitado.
6. Llega la siguiente pregunta: puede ser una **repregunta** sobre lo que dijo o una **nueva pregunta eje** que cruza otros temas. El entrevistador decide; el estudiante no recibe señales de si su respuesta fue buena.

**Reglas del turno**

| Situación | Comportamiento |
| --- | --- |
| Se acaba el tope del turno | Se envía lo que haya. Si está vacío, cuenta como **pasada**. El debate sigue. |
| Se acaba el tiempo global | Se envía lo que haya como última respuesta, sin repregunta, y se pasa al mediador. |
| "Pasar" (`P`) | Confirmación ligera ("¿Pasar esta pregunta?", `P` otra vez o `Enter`). Cuenta como pasada y llega otra pregunta. |
| "Reformular" (`R`) | El entrevistador dice la misma pregunta con otras palabras, sin dar pistas. **Máx. 1 vez por pregunta**; luego el botón se deshabilita. El tope del turno **no** se reinicia. |
| "Repetir audio" (`L`) | Vuelve a leer la pregunta en voz alta. Sin límite. |
| "Terminar debate" | Dialog de confirmación → mediador. Mínimo 1 respuesta enviada; si no hay ninguna, se ofrece solo "Salir sin evaluación". |
| `Esc` / X | Dialog con "Terminar y ver evaluación" (primario) y "Salir sin evaluación" (`danger`). Salir descarta el debate y no entra al historial. |
| Cambio de pestaña | Se registra (`useVisibilityGuard`) y se informa al mediador. No corta el debate. El reloj sigue corriendo. |
| Intento de pegar o soltar texto | Se bloquea, se registra y se muestra un toast "Pegar está desactivado en el debate". |

### 3.3 Espera del mediador

Al cerrar el debate: el área de juego se reemplaza por el cuy frontal (expresión "pensando") + "El mediador está evaluando tu debate…" + `Skeleton` de la estructura del informe. Puede tardar 3–10 s con el LLM real (en el mock: 2.5 s).

### 3.4 Informe (`/debate/[debateId]/informe`)

Ver §7.

---

## 4. Rol y comportamiento de la IA (para el contrato y el mock)

### 4.1 Entrevistador socrático

- **Nunca** da la respuesta, nunca dice "correcto"/"incorrecto", nunca da pistas del contenido.
- Cada **pregunta eje** cruza al menos **2 temas** de los elegidos ("¿Por qué la meiosis necesita una interfase previa, igual que la mitosis, si su objetivo es distinto?").
- Las **repreguntas** profundizan en lo que respondió el estudiante: pedir causa ("¿por qué?"), consecuencia ("¿qué pasaría si…?"), contraejemplo, o relación con otro tema de la lista.
- Rota los temas para que al final del debate todos hayan aparecido al menos una vez.
- Al reformular, cambia las palabras, no el contenido ni la dificultad.
- Tono: compañero exigente, tuteo, español neutro peruano, oraciones ≤ 25 palabras (excepción a las 15 palabras de §15: una pregunta socrática necesita contexto).
- Si la respuesta está vacía o fuera de tema, pasa a otra pregunta sin comentarlo.

### 4.2 Mediador

- Lee el transcript completo, los temas, los átomos de la fuente y los eventos (pegados, cambios de pestaña, modo de respuesta por turno).
- Evalúa con la rúbrica (§7.1) y devuelve un informe estructurado (§9.3).
- Cada error debe citar **textual** lo que dijo el estudiante, la corrección y la fuente (documento + página).
- Los eventos de integridad se mencionan en el informe de forma neutral ("Cambiaste de pestaña 2 veces"), sin acusar.

---

## 5. Niveles de dificultad

Punto de partida, ajustable con pruebas de usuarios. Con el ajuste de accesibilidad (§14 del DS, tiempo ×1.5) se multiplican la duración total y el tope por turno.

| Nivel (`difficulty`) | Duración total | Temas cruzados | Tope por turno |
| --- | --- | --- | --- |
| `baja` | 3 min | 2 | 90 s |
| `media` | 5 min | 3 | 60 s |
| `alta` | 8 min | 4 | 45 s |

La profundidad de las repreguntas **no** cambia por nivel en v1.

Si el curso no tiene suficientes temas publicados para el nivel elegido, el selector deshabilita ese nivel con el texto "Se necesitan N temas publicados".

---

## 6. Pantalla del debate: layout y componentes

### 6.1 Desktop (base 1280 × 720)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [X Salir  Esc]        💬 Debate · Mitosis · Meiosis · Ciclo celular    [🔊] [⏹ Terminar] │ ← DebateHeader (64 px)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ⏱ 3:42 │ ← GameTimer (global)
├────────────────────────────────────────────────────────────────────────────────┤
│   ┌──────────── área central · máx. 960 px ──────────────┐  ┌─ Historial ─┐ │
│   │ (◎) Entrevistador · Pregunta 3 · Repregunta            │  │ P1 ✓ resp.  │ │
│   │                                                        │  │ P2 ↷ pasada │ │
│   │ ¿Por qué la meiosis necesita una interfase previa,      │  │ P3 …        │ │ ← DebateHistory
│   │ igual que la mitosis, si su objetivo es distinto?       │  │             │ │   (colapsable, 280 px)
│   │                                     [🔁 Repetir  L]     │  │             │ │
│   ├────────────────────────────────────────────────────────┤  └─────────────┘ │
│   │ ┌────────────────────────────────────────────────────┐ │                  │
│   │ │ Tu respuesta…                                       │ │ ← AnswerComposer │
│   │ │                                         142 / 600   │ │                  │
│   │ └────────────────────────────────────────────────────┘ │                  │
│   │ ▓▓▓▓▓▓▓▓▓▓░░░░░░ turno 0:38                             │ ← TurnTimer      │
│   │ [🎙 Dictar  Espacio] [Pasar  P] [Reformular  R]  [Responder ⌘⏎] │          │
│   └────────────────────────────────────────────────────────┘                  │
│        Atajos: Espacio dictar · ⌘⏎ responder · P pasar · R reformular · L repetir · Esc salir │
└────────────────────────────────────────────────────────────────────────────────┘
```

- El historial muestra los turnos anteriores (pregunta + tu respuesta, colapsadas a 2 líneas, expandibles). **Sin marcas de calidad** (no da pistas): solo estado `respondida` / `pasada` / `reformulada`. Por defecto abierto en ≥1280 px y cerrado en 1024–1279 px.
- Todo debe caber sin scroll en 1280 × 720 y 1366 × 650. Si la respuesta es larga, el `Textarea` hace scroll interno.

### 6.2 Tablet y móvil

| Dispositivo | Cambios |
| --- | --- |
| Tablet (768–1023) | Historial como `Sheet` lateral que se abre con un botón "Historial (3)" en el header. |
| Móvil (<768) | Header 56 px con solo X, nombre, 🔊 y menú "⋯" (Historial, Terminar). Pregunta arriba (`prompt` 18 px), compositor abajo pegado al teclado virtual. Botones: `Dictar` y `Responder` grandes; `Pasar` y `Reformular` como `ghost` en una fila. Historial como bottom sheet. Sin `Kbd` ni leyenda de atajos. Usar `100dvh`. |

### 6.3 Compositor de respuesta (`AnswerComposer`)

Un solo campo de texto para los dos modos: el dictado **escribe dentro del mismo `Textarea`**, así se puede alternar voz ↔ escrito en cualquier momento.

| Elemento | Detalle |
| --- | --- |
| `Textarea` | Del UI kit. Máx. 600 caracteres con contador. `onPaste` y `onDrop` bloqueados (registran evento + toast). Se desactiva el autocompletado del navegador (`autoComplete="off"`, `spellCheck` activo). |
| Botón `Dictar` | Toca para empezar y otra vez para detener (`Espacio` cuando el foco no está en el `Textarea`). Mientras dicta: botón en estado activo con pulso suave, ícono `Mic` → `MicOff` para detener, y el texto provisional (interim) aparece en `text-muted` al final del texto; al confirmarse pasa a `text`. |
| Inserción del dictado | Se inserta en la posición del cursor (o al final). El estudiante puede editarlo libremente después. |
| Regrabar | Botón `Borrar` (`ghost`) limpia el campo para volver a dictar. Sin límite, dentro del tope del turno. |
| Registro por turno | `inputModes: ("voz" \| "texto")[]` usados, `dictatedChars`, `typedChars`, `pasteAttempts`, `durationMs`. |
| Responder | Deshabilitado si el texto está vacío (para eso está "Pasar"). |

### 6.4 Avatar del entrevistador (`InterviewerAvatar`)

- Contenedor de ícono destacado (48 × 48, `radius-md`, `primary-soft`) con el ícono `MessagesSquare` en `primary`.
- Al hablar (TTS activo): 3 barras de onda animadas al lado (respetan `prefers-reduced-motion`: se reemplazan por el texto "Hablando").
- Al pensar: puntos animados + "Pensando…" (`aria-live="polite"`).
- Decorativo (`aria-hidden`); el estado se anuncia por texto.

### 6.5 Iconos y acento

| Concepto | Ícono lucide |
| --- | --- |
| Debate (tarjeta, informe, historial) | `MessagesSquare`, acento `cat-4` |
| Dictar / detener | `Mic` / `MicOff` |
| Voz del entrevistador on / off | `Volume2` / `VolumeX` |
| Repetir audio | `RotateCcw` |
| Pasar | `SkipForward` |
| Reformular | `Repeat2` |
| Terminar debate | `Square` |
| Mediador / informe | `Gavel` |
| Premium / bloqueado | `Lock` + badge `reward` "Premium" |

Agregar estas filas a §8.1 y §8.2 del DS.

### 6.6 Temporizadores

- **Global**: `GameTimer` existente (barra completa bajo el header, color `timer`, umbrales de §11.2). Se pausa durante "Pensando…". El servidor devuelve el `deadline` actualizado en cada turno (ver §9).
- **Por turno** (`TurnTimer`): barra fina (6 px) dentro del área central, sobre los botones, también en `timer`. Al llegar al 20 % pulsa el número y anuncia "Quedan 10 segundos de turno".
- Los dos relojes nunca anuncian a la vez a lectores de pantalla: manda el que expira primero.

---

## 7. Informe del mediador

### 7.1 Rúbrica

Cada criterio vale 0–4.

| Criterio (`id`) | Qué mide |
| --- | --- |
| `precision` · Precisión conceptual | Lo que afirma es correcto según el material. |
| `integracion` · Integración de temas | Conecta los temas entre sí en lugar de responder cada uno aislado. **Criterio central del modo.** |
| `argumentacion` · Solidez argumentativa | Estructura afirmación → razón → evidencia/ejemplo; no se contradice. |
| `repregunta` · Respuesta a la repregunta | Responde lo que se le pregunta cuando lo presionan, sin evadir ni repetir. |

**Nota general** = promedio de los 4 (0–4, un decimal). **Estrellas** (informativas, no dan puntos): 3 si ≥ 3.5 · 2 si ≥ 2.5 · 1 si ≥ 1.5 · 0 si menos. Se calcula en el backend; el frontend solo lo muestra (`stars.ts` existente puede tener una variante `debateStars`).

### 7.2 Estructura de la pantalla

Desktop: dos columnas (patrón de la pantalla de resultado, §6.3 del DS). Móvil: una columna en el mismo orden.

**Columna izquierda (resumen)**

1. Cuy frontal (expresión según la nota: celebrando ≥ 3, animando < 3; nunca decepcionado) + título "Así te fue en el debate".
2. Nota general grande (`display-xl`, `tabular-nums`) "3.2 / 4" + `StarRating`.
3. **Veredicto** (1–2 oraciones), ej. "Dominas Mitosis; cuando conectas con Meiosis te faltan las diferencias en la profase I."
4. **Estadísticas del debate** (no entran a la nota): preguntas respondidas / pasadas / total, reformulaciones usadas, tiempo promedio de respuesta, modo usado (% voz / % escrito), duración real.
5. **Integridad** (solo si hubo eventos): "Intentaste pegar texto 1 vez · Cambiaste de pestaña 2 veces", en `text-secondary`, sin rojo.
6. Botones: "Otro debate" (primario) y "Mis debates" (secundario).

**Columna derecha (detalle)**

1. **Rúbrica**: una tarjeta por criterio con barra 0–4 (`ProgressBar`), la nota, **"Lo que hiciste bien"** (1 frase) y **"Para mejorar"** (1 frase).
2. **Errores** (lista; si no hay: "No encontramos errores conceptuales."): cita textual de lo que dijo (`"…"`), ícono `CircleX` + "Lo correcto:", corrección, y la fuente "Semana 5 · Tema.pdf, p. 8". Cada error enlaza al turno del transcript.
3. **Transcript anotado** (acordeón, cerrado por defecto): cada turno con la pregunta, la respuesta y una marca con ícono + texto (nunca solo color):

| Marca | Ícono | Color | Texto |
| --- | --- | --- | --- |
| `solida` | `CircleCheck` | `success` | Sólida |
| `imprecisa` | `CircleAlert` | `warning` | Imprecisa |
| `erronea` | `CircleX` | `error` | Errónea |
| `evadida` | `CornerUpRight` | `text-muted` | Evadida |
| `pasada` | `SkipForward` | `text-muted` | Pasada |

Cada turno muestra además el modo usado (🎙/⌨) y un comentario corto del mediador (opcional).

### 7.3 Historial (`/cursos/[courseId]/debate/historial`)

Lista de debates del estudiante en ese curso: fecha (`lun 3 nov`), temas (chips), nivel, nota general y estrellas. Clic → informe. Estado vacío con `EmptyState` + cuy: "Aún no tienes debates. Tu primer debate dura 3 minutos." En el mock se guarda en memoria (se pierde al recargar, igual que el resto del mock).

---

## 8. Premium

- El mock devuelve `premium: boolean` en el progreso/curso (`GET /api/courses/{courseId}` o `/progress`). Para la demo: curso de ejemplo con `premium: true` y un segundo con `false`, o un toggle en la herramienta de desarrollo del mock.
- **Con plan**: la tarjeta "Debate" aparece en `/cursos/[courseId]/jugar` como tarjeta destacada (fuera de la grilla numerada de los 10 minijuegos), con badge `reward` "Premium" y el texto "Ilimitado · no usa tus 10 retos".
- **Sin plan**: la misma tarjeta con `Lock`, contenido atenuado y botón secundario "Ver planes" → `/planes`.
- **`/planes`**: página estática con dos tarjetas, **Gratis** (10 retos semanales, ranking, feedback) y **Premium** (Modo Debate ilimitado, informes del mediador, historial de debates), con CTA "Próximamente" deshabilitado. El texto no menciona la universidad como único canal: "Disponible con el plan Premium."
- Acceso directo a `/cursos/[courseId]/debate` o `/debate/[id]` sin plan → error `PREMIUM_REQUIRED` → redirige a `/planes`.

---

## 9. Contrato con el backend

Mismo estilo que §17 del DS. Los route handlers los implementa backend; aquí solo se mockean con MSW.

### 9.1 Endpoints

| Método | Endpoint | Propósito |
| --- | --- | --- |
| `GET` | `/api/courses/{courseId}/debates/setup?difficulty=` | Si el curso tiene Premium, temas que eligió el sistema para ese nivel + configuración del nivel + si hay temas suficientes. |
| `POST` | `/api/courses/{courseId}/debates` | Crea el debate → `DebateSession` con la primera pregunta. |
| `GET` | `/api/debates/{debateId}` | Sesión en curso (pregunta actual, `deadline`, historial) para recargar la página. `DEBATE_CLOSED` si ya terminó. |
| `POST` | `/api/debates/{debateId}/turns` | Envía una respuesta (o pasa) → siguiente pregunta o cierre. |
| `POST` | `/api/debates/{debateId}/rephrase` | Pide reformular la pregunta actual. |
| `POST` | `/api/debates/{debateId}/events` | Registra eventos de integridad (pegar, cambio de pestaña). Se puede enviar por lotes. |
| `POST` | `/api/debates/{debateId}/finish` | Cierra el debate (`reason`) y lanza la evaluación → `202`. |
| `DELETE` | `/api/debates/{debateId}` | "Salir sin evaluación": descarta el debate. |
| `GET` | `/api/debates/{debateId}/report` | Informe. `202 { status: "evaluating" }` mientras el mediador trabaja (poll cada 1.5 s con TanStack Query); `200 DebateReport` al terminar. |
| `GET` | `/api/courses/{courseId}/debates` | Historial del estudiante (`DebateSummary[]`). |

### 9.2 Tipos

```ts
type Difficulty = "baja" | "media" | "alta";

interface DebateTopic {
  id: string;                    // id del átomo o del tema
  nombre: string;                // "Meiosis"
  semana: number;
}

interface DebateSetup {
  premium: boolean;              // false: el curso no tiene el plan; topics llega vacío
  difficulty: Difficulty;
  topics: DebateTopic[];         // elegidos por el sistema, solo lectura
  totalSeconds: number;
  turnSeconds: number;
  available: boolean;            // false si no hay temas suficientes
  requiredTopics: number;
}

interface DebateQuestion {
  id: string;
  text: string;
  kind: "eje" | "repregunta";
  topicIds: string[];            // temas que cruza (para el historial; no revela calidad)
  canRephrase: boolean;
}

interface DebateSession {
  debateId: string;
  courseId: string;
  difficulty: Difficulty;
  topics: DebateTopic[];
  totalSeconds: number;
  turnSeconds: number;
  startedAt: string;             // ISO, hora del servidor
  deadline: string;              // ISO, hora del servidor; se recalcula en cada turno (pausas)
  serverTime: string;            // para el desfase de reloj (§17 del DS)
  question: DebateQuestion;
  history: { question: DebateQuestion; answer: string | null; rephrased: boolean }[];
}

interface DebateTurnRequest {
  questionId: string;
  action: "answer" | "pass";
  text: string;                  // fuente de verdad (transcripción ya editada o texto escrito)
  inputModes: ("voz" | "texto")[];
  dictatedChars: number;
  typedChars: number;
  pasteAttempts: number;
  durationMs: number;            // tiempo del turno medido en el cliente (el servidor valida con el suyo)
  timedOut: boolean;             // true si lo envió el tope del turno o el reloj global
  // audio opcional: si NEXT_PUBLIC_DEBATE_SEND_AUDIO=true, la petición va como multipart
  // con este JSON en el campo "turn" y el audio (webm/opus) en "audio", para que el backend
  // pueda re-transcribir con un modelo multimodal (Gemini/Whisper).
}

interface DebateTurnResponse {
  status: "continue" | "closed"; // "closed" si el tiempo global se agotó
  deadline: string;              // deadline actualizado (descuenta el tiempo "Pensando…")
  serverTime: string;
  question?: DebateQuestion;     // siguiente pregunta si status = "continue"
}

interface DebateRephraseResponse {
  question: DebateQuestion;      // mismo id, nuevo text, canRephrase: false
  deadline: string;
  serverTime: string;
}

type IntegrityEvent =
  | { type: "paste_blocked"; questionId: string; at: string }
  | { type: "tab_hidden"; questionId: string; at: string; durationMs?: number };

interface DebateFinishRequest {
  reason: "timeout" | "user_finished";
}

type CriterionId = "precision" | "integracion" | "argumentacion" | "repregunta";
type TurnMark = "solida" | "imprecisa" | "erronea" | "evadida" | "pasada";

interface DebateReport {
  debateId: string;
  difficulty: Difficulty;
  topics: DebateTopic[];
  overall: number;               // 0–4, un decimal
  stars: 0 | 1 | 2 | 3;
  verdict: string;               // máx. 280 caracteres
  criteria: {
    id: CriterionId;
    score: 0 | 1 | 2 | 3 | 4;
    strength: string;            // "Lo que hiciste bien", máx. 160
    improvement: string;         // "Para mejorar", máx. 160
  }[];
  errors: {
    turnIndex: number;
    quote: string;               // cita textual del estudiante
    correction: string;
    source: { documento: string; pagina?: number };
  }[];
  stats: {
    questionsTotal: number;
    answered: number;
    passed: number;
    rephrasesUsed: number;
    avgResponseMs: number;       // solo turnos respondidos
    voiceShare: number;          // 0–1, por caracteres dictados / totales
    durationMs: number;
  };
  integrity: { pasteAttempts: number; tabHidden: number };
  transcript: {
    index: number;
    question: DebateQuestion;
    rephrased: boolean;
    answer: string | null;       // null si pasó
    inputModes: ("voz" | "texto")[];
    durationMs: number;
    mark: TurnMark;
    comment?: string;            // comentario corto del mediador
  }[];
  createdAt: string;
}

interface DebateSummary {
  debateId: string;
  createdAt: string;
  difficulty: Difficulty;
  topics: DebateTopic[];
  overall: number;
  stars: 0 | 1 | 2 | 3;
}
```

Todos los tipos se definen como schemas zod en `src/features/debate/schema.ts` y se validan al recibir (igual que `payloadSchema` de los juegos).

### 9.3 Errores nuevos

`PREMIUM_REQUIRED`, `DEBATE_NOT_FOUND`, `DEBATE_CLOSED` (turno después del cierre), `DEBATE_NOT_FINISHED` (informe de un debate en curso), `NOT_ENOUGH_TOPICS`, `REPHRASE_USED`. Se mapean a mensajes en `copy.ts`.

### 9.4 Reglas del servidor (para backend)

- El servidor es dueño del tiempo: valida `deadline` + margen de red (1.5 s) y descuenta el tiempo de generación del LLM.
- El LLM del entrevistador recibe: temas, átomos de esos temas (de varias semanas), historial de turnos. Nunca se envían al cliente los átomos ni la rúbrica en curso.
- La salida del entrevistador y del mediador se valida con zod (`generateObject`); si falla, se reintenta una vez.
- El audio opcional, si llega, no se guarda más allá de la evaluación (privacidad).

---

## 10. Mock (MSW)

Archivo nuevo `src/mocks/debate.ts` + handlers en `src/mocks/handlers.ts`.

| Pieza | Cómo se simula |
| --- | --- |
| Átomos de varias semanas | Agregar a `src/mocks/data/atoms.ts` átomos de semanas 3 y 4 (ej. "Ciclo celular", "ADN y replicación", "Cromosomas") con su `fuente`, para tener temas cruzados reales. |
| Elección de temas | Tema(s) de la semana actual + el resto al azar de semanas anteriores, según `requiredTopics`. |
| Preguntas eje | Plantillas que cruzan dos átomos: "¿Qué relación hay entre {A} y {B}?", "¿En qué se diferencian {A} y {B} en cuanto a {campo}?", "Si {confusión de A}, ¿qué pasaría con {B}?" (usa `confusiones` y `relacionados`). |
| Repreguntas | Si la respuesta no menciona palabras clave de la `definicion` del átomo, o tiene < 15 palabras: "¿Por qué?", "¿Puedes dar un ejemplo?", "¿Y cómo se conecta eso con {otro tema}?". Máx. 2 repreguntas seguidas por pregunta eje. |
| Reformular | Segunda plantilla para la misma pregunta. |
| Latencia | 1.2 s "Pensando…" por turno; 2.5 s del mediador. El `deadline` se extiende esos ms. |
| Mediador | Heurística por ideas clave (reutiliza `normalize`/`keywords` de `src/mocks/games/explicalo.ts`, movidos a `src/mocks/text.ts`): `precision` = % de ideas clave correctas vs confusiones mencionadas; `integracion` = respuestas que mencionan ≥ 2 temas; `argumentacion` = presencia de conectores causales ("porque", "por lo tanto", "por ejemplo") y longitud; `repregunta` = repreguntas respondidas no vacías y con ideas nuevas. Errores = frases que contienen una `confusion` del átomo. Textos de `strength`/`improvement`/`verdict` desde plantillas por rango de nota. |
| Premium | `premium` por curso en `src/mocks/db.ts`. |
| Historial | Arreglo en memoria por curso. |

El mock **no** recibe audio. Si `NEXT_PUBLIC_DEBATE_SEND_AUDIO=true`, el handler acepta el multipart y lo ignora.

---

## 11. Voz en el navegador

### 11.1 Dictado (entrada)

- `useDictation()` en `src/lib/hooks/useDictation.ts`: envuelve `SpeechRecognition` / `webkitSpeechRecognition` con `lang = "es-PE"`, `continuous = true`, `interimResults = true`.
- Devuelve `{ supported, permission, listening, interim, start, stop }` y llama a `onFinal(text)` con cada fragmento confirmado.
- Detección de soporte en la intro: si no existe la API → solo escrito. Si `getUserMedia({ audio: true })` es rechazado → solo escrito con aviso "Sin acceso al micrófono".
- Se detiene solo si: el estudiante toca detener, envía, se acaba el turno o el reloj global, o la pestaña se oculta.
- Chrome corta el reconocimiento tras silencios largos: el hook lo reinicia mientras `listening` sea true.
- Aviso de privacidad en la intro (una línea, `caption`): "El dictado usa el reconocimiento de voz de tu navegador."
- Si `NEXT_PUBLIC_DEBATE_SEND_AUDIO=true`: en paralelo, `MediaRecorder` (audio/webm;codecs=opus) graba los segmentos dictados del turno y se adjuntan al enviar. Apagado por defecto.

### 11.2 Lectura en voz alta (salida)

- `useSpeech()` en `src/lib/hooks/useSpeech.ts`: `speechSynthesis` con la mejor voz `es-*` disponible (preferir `es-PE`, luego `es-419`/`es-MX`, luego `es-ES`).
- Botón 🔊/🔇 en el header; preferencia guardada en el store de sesión del debate (no `localStorage`, §16.3 del DS; opcional: perfil del usuario más adelante).
- Al empezar a dictar se cancela la lectura en curso (para que el micrófono no capte la voz del entrevistador).
- Futuro: el backend puede devolver `audioUrl` del TTS en `DebateQuestion`; el hook lo prefiere si existe.

---

## 12. Accesibilidad

- El texto de cada pregunta **siempre** está visible: cubre a quien no puede escuchar. El modo escrito cubre a quien no puede hablar.
- `aria-live="polite"` para la pregunta nueva, "Pensando…" y cambios de estado del dictado ("Dictando", "Dictado detenido").
- Temporizadores: anuncios solo en umbrales (50 %, 20 %, últimos 10 s), sin solaparse (§6.6).
- Botón de dictar con `aria-pressed`. Todos los botones de ícono con `aria-label`.
- Ajuste de tiempo por accesibilidad (×1.5) aplica a duración total y tope por turno.
- Marcas del transcript con ícono + texto, nunca solo color.
- `prefers-reduced-motion`: sin ondas ni pulsos; solo cambios de opacidad.
- Todo el flujo se completa con teclado.

### 12.1 Atajos (`useDebateHotkeys`, activos solo mientras el debate corre)

| Tecla | Acción | Activo con foco en el `Textarea` |
| --- | --- | --- |
| `Ctrl/⌘ + Enter` | Responder | Sí |
| `Ctrl/⌘ + M` | Dictar / detener | Sí |
| `Espacio` | Dictar / detener | No |
| `P` | Pasar (confirmar con `P` o `Enter`) | No |
| `R` | Reformular | No |
| `L` | Repetir audio | No |
| `Esc` | Salir (dialog) | Sí (primero quita el foco del campo) |

Agregar la fila del Debate a §11.5 del DS.

---

## 13. Estructura de archivos

El Debate **no** se registra en `gameRegistry` (no es un minijuego de un turno y no implementa `GameDefinition`). Vive como feature aparte y reutiliza piezas del shell.

```
src/
├── app/(student)/
│   ├── cursos/[courseId]/debate/page.tsx            # Intro
│   ├── cursos/[courseId]/debate/historial/page.tsx  # Historial
│   ├── debate/[debateId]/page.tsx                   # Debate en curso + espera del mediador
│   ├── debate/[debateId]/informe/page.tsx           # Informe
│   └── planes/page.tsx                              # Gratis vs Premium
├── features/debate/
│   ├── schema.ts               # zod de §9.2 (fuente única de los tipos)
│   ├── levels.ts               # tabla de §5
│   ├── logic.ts                # funciones puras: estado del turno, stats, decidir envío por timeout
│   ├── logic.test.ts
│   ├── store.ts                # Zustand: estado del debate (turnos, pregunta actual, eventos, mute)
│   ├── DebateIntro.tsx
│   ├── DebateScreen.tsx        # orquesta: header, timers, pregunta, compositor, historial
│   ├── DebateHeader.tsx        # reutiliza GameHeader si se puede extender con acciones
│   ├── InterviewerAvatar.tsx
│   ├── QuestionCard.tsx
│   ├── AnswerComposer.tsx
│   ├── TurnTimer.tsx
│   ├── DebateHistory.tsx
│   ├── MediatorWaiting.tsx
│   ├── DebateReport.tsx        # + RubricCard, ErrorList, AnnotatedTranscript, DebateStats
│   ├── DebatePremiumCard.tsx   # tarjeta en /jugar (con plan / bloqueada)
│   ├── fixtures.ts             # informes y sesiones de ejemplo
│   └── README.md
├── lib/hooks/
│   ├── useDictation.ts
│   ├── useSpeech.ts
│   └── useDebateHotkeys.ts
├── lib/api/debate.ts           # cliente + queries/mutations TanStack Query
├── mocks/debate.ts             # generador de preguntas y mediador simulado
└── content/copy.ts             # sección copy.debate
```

**Piezas que se reutilizan de `ramaWilli`:** `GameTimer`, `GameHeader` (extender con slot de acciones a la derecha), `ConfirmDialog` (extender a dos acciones), `Textarea`, `Button`, `Card`, `Kbd`, `Skeleton`, `EmptyState`, `StarRating`, `useCountdown`, `useVisibilityGuard`, `ShortcutLegend`, `cn`, `format`.

**Piezas que faltan en `ramaWilli` y hay que crear (en `components/ui` o `components/brand`):** `Sheet` (Radix Dialog), `Toast`, `ProgressBar`, `Badge`, `Chip`, `CuyFrontal` (con expresiones "invitando", "pensando", "celebrando", "animando"; si no hay SVG aún, placeholder con `aria-hidden`).

**Ajustes compartidos mínimos (decisión #4):** en `src/games/types.ts` agregar el tipo `Difficulty` de v0.3 como `DifficultyLevel = "baja" | "media" | "alta"` para el Debate, sin cambiar el `Difficulty = 1 | 2 | 3` de los juegos todavía. Agregar el campo `premium` al schema de progreso/curso.

---

## 14. Cambios al design system (PR con etiqueta `design-system`)

1. **§1 Principios**: nota de excepción — "El Modo Debate (premium) es la única experiencia donde la IA participa durante la práctica, como examinador y nunca como ayuda."
2. **§2.1**: la frase "La única llamada a IA durante el uso del estudiante es Explícalo" pasa a incluir el Debate.
3. **§6.5 Mapa de pantallas**: agregar las 5 rutas de §13.
4. **§8.1 / §8.2**: íconos de §6.5 de este spec.
5. **§11.5**: atajos del Debate.
6. **§12**: nueva subsección "Modo Debate (premium)" con la tabla de niveles (§5) y un enlace a este spec.
7. **§13**: aclarar que el Debate no da puntos ni consume la cuota semanal.
8. **§17**: endpoints y tipos de §9.
9. **§20**: agregar las decisiones abiertas de §17 de este spec.

---

## 15. Microcopy (en `copy.debate`)

| Situación | Texto |
| --- | --- |
| Tarjeta (con plan) | "Debate · Responde preguntas que conectan varios temas. Ilimitado, no usa tus 10 retos." |
| Tarjeta (sin plan) | "Debate · Disponible con el plan Premium." + "Ver planes" |
| Intro título | "Debate" / "Te harán preguntas que conectan varios temas. Sin pistas." |
| Temas | "Hoy conversaremos sobre:" |
| Sin dictado | "Tu navegador no permite dictado; responderás escribiendo." |
| Micrófono denegado | "Sin acceso al micrófono; responderás escribiendo." |
| Botón inicio | "Empezar debate" |
| Pensando | "Pensando…" |
| Mediador oculto | "El mediador está tomando nota" |
| Pegar bloqueado | "Pegar está desactivado en el debate." |
| Pasar (confirmar) | "¿Pasar esta pregunta?" |
| Reformular usado | "Ya pediste reformular esta pregunta." |
| Fin del turno | "Se acabó tu turno. Enviamos lo que tenías." |
| Fin del tiempo | "Se acabó el tiempo del debate." |
| Salir (dialog) | "¿Terminar el debate?" · "Terminar y ver evaluación" · "Salir sin evaluación" |
| Espera mediador | "El mediador está evaluando tu debate…" |
| Informe título | "Así te fue en el debate" |
| Sin errores | "No encontramos errores conceptuales." |
| Historial vacío | "Aún no tienes debates. Tu primer debate dura 3 minutos." |
| Planes CTA | "Próximamente" |

---

## 16. Pruebas y Definition of Done

**Unitarias (Vitest)**

- `features/debate/logic.ts`: cálculo de stats (respondidas, pasadas, promedio solo de respondidas, `voiceShare`), decisión de envío al expirar turno vs reloj global, `canRephrase`, armado del `DebateTurnRequest`.
- `mocks/debate.ts`: preguntas eje cruzan ≥ 2 temas; todos los temas aparecen; repreguntas máx. 2 seguidas; el mediador devuelve un `DebateReport` válido con el schema zod.
- `useDictation`: con un `SpeechRecognition` falso — inserta finales, muestra interim, reinicia tras `onend` mientras escucha, se detiene al ocultar la pestaña.

**DoD**

- [ ] Flujo completo intro → debate → mediador → informe → historial con MSW.
- [ ] Premium on/off funciona, incluida la redirección a `/planes` y la página `/planes`.
- [ ] Voz y escrito alternables en el mismo turno; pegar bloqueado y registrado.
- [ ] Fallback a escrito en Firefox y con micrófono denegado.
- [ ] Reloj global pausado durante "Pensando…" (deadline del servidor), tope por turno, fin del tiempo envía y cierra.
- [ ] Cabe sin scroll en 1280 × 720 y 1366 × 650; probado en 768 y 390 × 844 con teclado virtual.
- [ ] Todos los atajos de §12.1 y leyenda visible en ≥1024 px.
- [ ] `prefers-reduced-motion`, lectores de pantalla (anuncios sin solaparse), zoom 200 %.
- [ ] Solo tokens; textos en `copy.ts`; schemas zod para todo lo que llega del API.
- [ ] `README.md` del feature con las decisiones de este spec.
- [ ] PR al design system con los cambios de §14.

---

## 17. Fuera de alcance (v1) y decisiones abiertas

**Fuera de alcance**

- LLM real, TTS del servidor y re-transcripción del audio (backend).
- Pagos reales y gestión de planes.
- Vista del docente con agregados anónimos ("temas más flojos de la sección").
- Migración de los 10 minijuegos de `ramaWilli` al markdown v0.3.
- Persistencia real del historial (el mock vive en memoria).

**Decisiones abiertas**

| # | Tema | Opciones |
| --- | --- | --- |
| 1 | Modelo para entrevistador y mediador | Gemini (acepta audio, útil si se activa `SEND_AUDIO`) vs Qwen; elegir con pruebas como en §20.9 del DS. |
| 2 | ¿Se activa el envío de audio? | Mantener texto como fuente de verdad (v1) vs re-transcribir en servidor con Gemini/Whisper para corregir términos técnicos. |
| 3 | Profundidad por nivel | Hoy no cambia; evaluar si en `alta` el entrevistador repregunta más. |
| 4 | ¿El docente revisa los temas del debate? | Hoy los elige el sistema sin revisión; evaluar si el docente aprueba "mesas" como hace con los retos. |
| 5 | Límite de uso premium | "Ilimitado" puede costar mucho en LLM; evaluar un tope diario blando (ej. 10 por día) en el gateway. |
| 6 | Logros ligados al Debate | Ej. "Primer debate", "Nota 4 en integración" (sin puntos de ranking). |

---

## 18. Notas de implementación (30/10/2026)

Implementado en `ramaWilliv2` (avanzada por fast-forward a `origin/main`, que ya integra los juegos de `ramaWilli`). Detalle en `src/features/debate/README.md`.

**Diferencias con el spec**

| Spec | Implementado | Por qué |
| --- | --- | --- |
| Espera del mediador en `/debate/[debateId]` (§3.3) | En `/debate/[debateId]/informe`, que muestra la espera mientras el informe responde 202 | Una sola pantalla hace el poll; recargar no pierde la espera |
| Premium en el progreso del curso (§8) | `premium` en `DebateSetup` | No toca `progressTotalsSchema`, que ya usa el backend real |
| Menú "⋯" con Terminar en móvil (§6.2) | En móvil, Terminar está en el diálogo de la X | Mismo resultado con un botón menos en 390 px |
| Ajuste de tiempo ×1.5 (§5, §12) | No implementado | No existe aún la configuración por estudiante |
| Sin sesión real de backend | Tarjeta oculta si el endpoint de setup falla | Con `NEXT_PUBLIC_API_MOCKING=disabled` los endpoints del Debate no existen todavía |

**Archivos:** `src/features/debate/*`, `src/lib/api/{debate,debateQueries}.ts`, `src/lib/hooks/{useDictation,useSpeech,useDebateHotkeys,useBrowserSupport}.ts`, `src/mocks/{debate,debateHandlers,text}.ts`, rutas en `src/app/(student)/{cursos/[courseId]/debate,debate}` y `src/app/planes`, UI kit nuevo `Badge`, `ProgressBar`, `Sheet`, `brand/CuyFrontal`.

**Pendiente de §14 (cambios al design system):** no se editó `FRONTEND_DESIGN_SYSTEM.md`; los 9 cambios siguen pendientes de PR con etiqueta `design-system`.

**Paleta:** `tokens.css` migrado a la v0.3 (negro + naranja, §4.1–4.2) para toda la app, y `GameTimer` con color `timer` fijo (§11.2). Contraste AA verificado; única excepción del propio DS: `text-muted` sobre `surface-raised` (4.44:1), que el Debate evita.
