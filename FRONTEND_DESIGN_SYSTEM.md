# Design System y Estándares de Frontend

> Documento vivo del equipo. Todo lo que se construya en el frontend (pantallas, componentes y minijuegos) debe seguir este estándar. Si algo no está aquí, se propone en un PR que modifique este archivo antes de implementarlo.

**Producto:** plataforma de minijuegos semanales para universidades, generados desde los PDFs del curso, con leaderboard por sección y práctica sin IA.
**Público:** estudiantes universitarios peruanos (18–25 años), principalmente desde laptop; también en móvil y tablet en tiempos libres cortos.
**Base de diseño:** laptop/desktop (1280 × 720). Móvil y tablet son adaptaciones obligatorias, no opcionales.
**Posicionamiento:** "Duolingo para el estudio universitario: la IA prepara la práctica y se apaga durante el reto".
**Responsables frontend:** Luis y William · **Versión:** 0.3 · **Fecha:** 30/10/2026

> **Cambios en v0.3:** nueva arquitectura con pipeline de IA (MarkItDown → LLM de decisión → plantillas JSON → LLM de relleno → render), stack centrado en Next.js con Vercel AI SDK, repositorio en contenedores desplegado en Google Cloud (§2) y nueva paleta **negro + naranja** alineada al logotipo (§3–4).

---

## Índice

1. [Principios de diseño](#1-principios-de-diseño)
2. [Stack y arquitectura](#2-stack-y-arquitectura)
3. [Dirección visual y marca](#3-dirección-visual-y-marca)
4. [Design tokens](#4-design-tokens)
5. [Tipografía](#5-tipografía)
6. [Layout, grid y responsive](#6-layout-grid-y-responsive)
7. [Movimiento y animaciones](#7-movimiento-y-animaciones)
8. [Iconografía e ilustración](#8-iconografía-e-ilustración)
9. [Componentes base (UI kit)](#9-componentes-base-ui-kit)
10. [Componentes de gamificación](#10-componentes-de-gamificación)
11. [Arquitectura común de los minijuegos](#11-arquitectura-común-de-los-minijuegos)
12. [Especificación de cada minijuego](#12-especificación-de-cada-minijuego)
13. [Feedback, puntaje y reglas](#13-feedback-puntaje-y-reglas)
14. [Accesibilidad](#14-accesibilidad)
15. [Voz y microcopy](#15-voz-y-microcopy)
16. [Estructura del proyecto y convenciones de código](#16-estructura-del-proyecto-y-convenciones-de-código)
17. [Contrato con el backend](#17-contrato-con-el-backend)
18. [Flujo de trabajo del equipo](#18-flujo-de-trabajo-del-equipo)
19. [Definition of Done de un minijuego](#19-definition-of-done-de-un-minijuego)
20. [Decisiones pendientes](#20-decisiones-pendientes)

---

## 1. Principios de diseño

1. **Recordar, no reconocer.** Cada pantalla de juego obliga a producir o decidir, nunca a releer. Nada de material de consulta visible durante un reto.
2. **Rápido por diseño.** Un reto dura entre 20 y 90 segundos. El estudiante lo juega entre tareas en su laptop, o desde el celular en un tiempo muerto, y sale con puntos.
3. **Errar no castiga, enseña.** Una respuesta incorrecta da 0 puntos y una explicación clara. Nunca se restan puntos ni se usa rojo agresivo a pantalla completa.
4. **Progreso siempre visible.** Puntos, racha, retos restantes de la semana y posición en el leaderboard deben verse en máximo un toque.
5. **Un solo foco en el juego.** Dentro de un reto solo existen el enunciado, la interacción, el temporizador y el botón de acción. Las ilustraciones y decoraciones viven fuera del área de juego, y el cuy frontal solo aparece en las transiciones del reto, nunca mientras corre el temporizador (§3.2).
6. **Desktop como base, responsive siempre.** Cada pantalla se diseña primero a 1280 × 720 (laptop) y luego se adapta a tablet (768) y móvil (360). Ninguna pantalla se da por terminada sin sus tres versiones. Ver §6.0 para la diferencia entre "base de diseño" y "estrategia de CSS".
7. **Consistencia antes que creatividad.** Todos los juegos comparten el mismo shell, los mismos estados y el mismo feedback. La creatividad va en la mecánica, no en reinventar botones.
8. **Teclado como ciudadano de primera.** En laptop el estudiante tiene las manos en el teclado: todo juego se puede jugar completo con atajos (§11.5), además de mouse y táctil.

---

## 2. Stack y arquitectura

### 2.1 Arquitectura de la solución

Los juegos se generan **cuando el docente sube el material**, no cuando el estudiante juega. Así el reto carga al instante, el costo de IA es por documento (no por estudiante) y se cumple la regla central del producto: la IA prepara la práctica y se apaga durante el reto.

```
┌────────────────────┐      ┌───────────────┐      ┌──────────────────────┐
│ ① Subir archivos    │ ───▶ │ ② MarkItDown   │ ───▶ │ ③ System prompt       │
│ PDF / PPTX / DOCX   │      │    → .md       │      │ texto del .md +       │
└────────────────────┘      └───────────────┘      │ categorías de juegos  │
                                                    └──────────┬───────────┘
                                                               ▼
                                          ④ Modelo de decisión: "elige una plantilla"
                                                               │
                 ┌─────────────────────────────────────────────┼─────────────────────────────┐
                 ▼                                             ▼                             ▼
   { "type": "completar_oraciones",              { "type": "emparejar",          { "type": "ordenar_pasos",
     "difficulty": "alta",                         "difficulty": "media",          "difficulty": "baja",
     "args": { "oraciones": [],                    "args": { … } }                 "args": { … } }
               "palabras_a_completar": [] } }
                 │   plantilla elegida, con args vacíos
                 ▼
   ⑤ Modelo LLM: completa los parámetros (args) con el contenido del .md
                 │
                 ▼
   ⑥ Validación zod + revisión del docente ──▶ PostgreSQL
                 │
                 ▼
   ⑦ Renderizar el juego (registry + GameShell)
```

| Paso | Qué pasa | Tecnología | Salida |
| --- | --- | --- | --- |
| ① Subir archivos | El docente sube el material de una semana | Next.js (route handler) + Supabase Storage | Archivo original guardado |
| ② MarkItDown | Pasa el archivo a Markdown, el formato que mejor lee un LLM | `microsoft/markitdown` en un contenedor Python | `.md` guardado en la BD |
| ③ System prompt | El texto del `.md` va en el system prompt junto con las **categorías**: la lista de tipos de plantilla, con la descripción y el "sirve para" de cada una. Se arma automáticamente desde las plantillas (§2.2) | `packages/ai` | Prompt del modelo de decisión |
| ④ Modelo de decisión | Elige qué plantilla usar y con qué dificultad. Puede elegir varias por documento (por ejemplo, una por sección) | Vercel AI SDK (`generateObject`), con `type` restringido a los tipos que existen | `[{ type, difficulty, seccion }]` |
| ⑤ Completar parámetros | Toma la plantilla JSON del `type` elegido, con sus `args` vacíos, y un segundo LLM los rellena con el contenido del `.md` | Vercel AI SDK (`generateObject`) con el schema zod de la plantilla | Plantilla con `args` completos |
| ⑥ Validar y revisar | zod valida; si falla se reintenta una vez. El docente revisa, edita o descarta antes de publicar | Route handlers + PostgreSQL | Reto publicado |
| ⑦ Renderizar | Se envía al navegador el reto **sin la solución** y el frontend monta el juego según su `type` | Next.js + registry (§11.3) | Juego en pantalla |

Los pasos ④ y ⑤ en código:

```ts
// packages/ai/decidir.ts — paso ④
const { object: decision } = await generateObject({
  model: modeloDecision,                       // se define en el gateway (§2.3)
  system: promptDecision(categorias),          // categorías armadas desde las plantillas
  prompt: markdownDeLaSemana,
  schema: z.object({
    retos: z.array(z.object({
      type: z.enum(TIPOS),                     // solo puede elegir plantillas que existen
      difficulty: z.enum(["baja", "media", "alta"]),
      seccion: z.string(),                     // de qué parte del .md sale
    })).max(10),                               // límite de 10 retos por semana
  }),
});

// packages/ai/completar.ts — paso ⑤, una vez por reto elegido
const plantilla = plantillas[reto.type];
const { object: args } = await generateObject({
  model: modeloRelleno,
  system: plantilla.instrucciones,
  prompt: seccionDelMarkdown,
  schema: plantilla.argsSchema,                // el zod de la plantilla (§2.2)
});
```

La única llamada a IA durante el uso del estudiante es la evaluación de **Explícalo en una frase**, y ocurre **después** de enviar la respuesta.

### 2.2 Plantillas JSON: el contrato entre IA, backend y frontend

Cada juego tiene **una plantilla** con la misma forma que en el boceto de arquitectura: `type`, `difficulty` y `args`. El modelo de decisión llena `type` y `difficulty`; el segundo LLM llena `args`. El schema zod de `args` se usa en tres lugares: como salida estructurada del paso ⑤, para validar antes de guardar en la BD y para el payload del juego en el frontend (§11.3). Si alguien cambia los datos de un juego, cambia en un solo lugar y TypeScript avisa en los otros dos.

`packages/game-templates/completar_oraciones/template.json` (el juego **Hueco**):

```json
{
  "type": "completar_oraciones",
  "version": 1,
  "nombre": "Hueco",
  "descripcion": "Oración con un espacio en blanco; se elige la palabra correcta entre varias fichas",
  "sirvePara": "Definiciones y fórmulas",
  "niveles": {
    "baja":  { "oraciones": 3, "opciones": 3, "segundosPorOracion": 20 },
    "media": { "oraciones": 4, "opciones": 3, "segundosPorOracion": 15 },
    "alta":  { "oraciones": 5, "opciones": 4, "segundosPorOracion": 12 }
  },
  "difficulty": null,
  "args": {
    "oraciones": [],
    "palabras_a_completar": [],
    "distractores": [],
    "explicacion": ""
  }
}
```

- `descripcion` y `sirvePara` alimentan las **categorías** del system prompt (paso ③).
- `niveles` dice cuántos elementos pedirle al LLM según la `difficulty` elegida.
- `difficulty` y `args` van vacíos en la plantilla guardada; se completan en los pasos ④ y ⑤.

`packages/game-templates/completar_oraciones/schema.ts`:

```ts
import { z } from "zod";

export const completarOracionesArgs = z.object({
  oraciones: z.array(z.string().max(160)).min(3).max(5),       // con "___" donde va la palabra
  palabras_a_completar: z.array(z.string().max(30)),            // una por oración, en el mismo orden
  distractores: z.array(z.array(z.string().max(30)).min(2).max(3)), // 2–3 por oración
  explicacion: z.string().max(280),
}).refine(
  (a) => a.oraciones.length === a.palabras_a_completar.length
      && a.oraciones.length === a.distractores.length,
  { message: "Cada oración necesita su palabra y sus distractores" },
);

// Lo que recibe el navegador: opciones barajadas, sin decir cuál es la correcta
export const completarOracionesPayload = z.object({
  oraciones: z.array(z.object({
    id: z.string(),
    texto: z.string(),
    opciones: z.array(z.object({ id: z.string(), texto: z.string() })),
  })),
});
```

**Catálogo de tipos** (las categorías que ve el modelo de decisión)

| `type` | Juego | `args` principales (además de `explicacion`) |
| --- | --- | --- |
| `verdadero_falso` | Desliza | `afirmaciones: [{ texto, es_verdadera }]` |
| `emparejar` | Parejas | `conceptos`, `definiciones` (mismo orden) |
| `ordenar_pasos` | Ordena | `pasos` (en el orden correcto) |
| `clasificar` | Dos cajas | `categorias` (2), `tarjetas: [{ texto, categoria }]` |
| `completar_oraciones` | Hueco | `oraciones`, `palabras_a_completar`, `distractores` |
| `encontrar_error` | Encuentra el error | `lineas`, `linea_incorrecta`, `correccion` |
| `quien_soy` | ¿Quién soy? | `pistas` (de la más vaga a la más clara), `respuesta`, `opciones` |
| `intruso` | El intruso | `grupo`, `fichas`, `intruso` |
| `comparar_valor` | ¿Cuál es mayor? | `criterio`, `pares: [{ a, b, mayor }]` |
| `explicar_frase` | Explícalo en una frase | `concepto`, `texto_fuente` |

Los `args` de cada tipo salen de la columna "Qué toma del átomo" de la tabla de plantillas del equipo (§11.1).

**Reglas**

- `type` es el identificador del juego en todas partes: plantilla, BD, registry del frontend y nombre de carpeta.
- Claves en `snake_case`, sin tildes ni espacios. En el boceto, `"dificulty"` pasa a `"difficulty"` y `"Plaabras a completar"` a `"palabras_a_completar"`.
- `difficulty` siempre es `"baja"`, `"media"` o `"alta"`.
- Quien implementa un juego es dueño de su plantilla y su schema.
- Cambiar un schema obliga a subir `version`; los retos ya publicados conservan la versión con la que se generaron.
- Los `args` completos (con la solución) nunca salen del servidor; al navegador solo llega el payload.

### 2.3 Stack

| Capa | Elección | Por qué |
| --- | --- | --- |
| Aplicación | **Next.js (App Router) + TypeScript `strict`** | Frontend y API (route handlers y server actions) en un solo proyecto y un solo lenguaje. |
| SDK de IA | **Vercel AI SDK** | `generateObject` con esquemas zod devuelve JSON ya validado, que es justo lo que piden los pasos ④ y ⑤. Menos código y curva más corta que LangChain, como sugirió el mentor. LangChain queda para más adelante si se necesitan agentes o búsqueda sobre muchos documentos. |
| Gateway de modelos | **Vercel AI Gateway** (alternativa: Cloudflare AI Gateway) | Cambiar de modelo o proveedor sin tocar el código, ver el costo de cada llamada, poner límites de gasto y cachear respuestas. |
| Modelos | **Por definir con pruebas:** Qwen (el de bajo costo que mostró el mentor) y Gemini vía Google AI Studio | Ambos soportan salida estructurada. Elegir con 10–20 PDFs reales de los cursos, midiendo % de JSON válido, calidad del contenido y costo. Verificar precios vigentes antes de decidir. |
| Conversión a Markdown | **MarkItDown** (Microsoft, Python) | Convierte PDF, PPTX y DOCX a Markdown. Corre como servicio aparte porque es una librería de Python. |
| Base de datos y archivos | **PostgreSQL + Storage en Supabase** | PDFs originales en Storage; `.md`, retos, intentos y ranking en Postgres. |
| ORM | **Drizzle ORM** | Tipos de TypeScript desde el esquema y migraciones versionadas en el repo. |
| Autenticación | **Supabase Auth** (con `@supabase/ssr`) | Ya viene con la base de datos; sesión en cookie `httpOnly`, sin tokens en `localStorage`. |
| Monorepo | **pnpm workspaces + Turborepo** | Web, servicio de conversión y paquetes compartidos en un solo repositorio. |
| Contenedores y deploy | **Docker → Google Cloud Run** (imágenes en Artifact Registry, build con Cloud Build) | Lo que propuso el mentor: el repositorio agrupado en contenedores y desplegado en Google Cloud. |
| UI | Tailwind CSS v4, shadcn/ui (Radix), dnd-kit, Motion, lucide-react | Sin cambios (§4, §7, §9). |
| Datos y estado en el cliente | TanStack Query, Zustand, react-hook-form + zod | Sin cambios. |
| Calidad | Storybook, MSW, Vitest + Testing Library, Playwright, ESLint + Prettier + Husky, leva (solo en desarrollo, §16.5) | Sin cambios. |

> **¿Y Spring Boot?** Con esta arquitectura, Next.js cubre la API y el SDK de IA es de TypeScript, así que Spring Boot deja de ser necesario para la v1. Este documento lo asume así (ver §20, decisión 8). Si el equipo decide mantenerlo, Spring expone la API, Next.js queda solo como frontend y los tipos del API se generan desde el OpenAPI de Spring.

**Reparto sugerido**

| Quién | Qué |
| --- | --- |
| Luis y William | `apps/web`: UI kit, pantallas, `GameShell` y juegos |
| Sebas y Juan Diego | `services/markitdown`, `packages/ai` (prompts y llamadas a los LLM), `packages/db` y los route handlers de la API |
| Todos | `packages/game-templates`: cada quien la plantilla del juego que implementa |

### 2.4 Repositorio y contenedores

```
repo/
├── apps/
│   └── web/                  # Next.js: frontend + API (route handlers) + llamadas a IA
├── services/
│   └── markitdown/           # Python + FastAPI + markitdown → POST /convert
├── packages/
│   ├── game-templates/       # 10 plantillas JSON + schemas zod (fuente única, §2.2)
│   ├── ai/                   # prompts del LLM 1 y LLM 2 con Vercel AI SDK
│   └── db/                   # esquema Drizzle + migraciones
├── docker-compose.yml        # levanta web + markitdown + Postgres en local
├── turbo.json
└── pnpm-workspace.yaml
```

| Servicio | Contenedor | Dónde se despliega | Notas |
| --- | --- | --- | --- |
| `web` | Next.js con `output: "standalone"` | Cloud Run, público | Frontend, API y llamadas a IA |
| `markitdown` | Python + FastAPI + markitdown | Cloud Run, **privado** (solo lo llama `web`) | Recibe un archivo y devuelve Markdown |
| Base de datos | — | Supabase | Fuera de los contenedores |

- **Previews por PR:** Cloud Build puede desplegar cada PR como una revisión con etiqueta propia en Cloud Run (`pr-42---web-…run.app`). Ese enlace es el que se usa en las revisiones (§18).
- **Arranque en frío:** Cloud Run apaga los contenedores sin tráfico. Para la demo ante el jurado, configurar `min-instances=1` en `web`.
- **Secretos:** claves de los modelos y de Supabase en Secret Manager, nunca en el repo ni en variables `NEXT_PUBLIC_`.

### 2.5 Qué implica el pipeline para el frontend

| Necesidad | Qué se construye |
| --- | --- |
| El docente debe ver el avance de la generación | Componente `PipelineSteps` con estados: Subiendo → Convirtiendo → Analizando contenido → Generando retos → Listo para revisar (o Error, con botón "Reintentar"). Se actualiza consultando el estado cada 3 s con TanStack Query. |
| El docente revisa antes de publicar | Cada reto generado se muestra con **el mismo componente del juego** en `mode="preview"` (sin temporizador ni envío), con botones Editar, Descartar y Publicar. Por eso `GameProps` incluye `mode` (§11.3). |
| El `.md` puede salir mal | Vista previa del Markdown convertido para que el docente detecte texto perdido antes de generar. |
| Las claves de IA son secretas | El navegador **nunca** llama a un modelo directamente; todo pasa por route handlers. |

### 2.6 Riesgos y cómo manejarlos

- **El temporizador y la respuesta correcta los controla el servidor.** El navegador nunca recibe la solución antes de responder y el tiempo se valida en el servidor (`startedAt` + `deadline`). Si no, cualquier estudiante puede leer la respuesta desde las DevTools y el ranking pierde valor.
- **PDFs escaneados, con fórmulas o tablas.** MarkItDown extrae el texto que el PDF ya trae; si el PDF es una imagen escaneada, o tiene fórmulas o tablas complejas, el Markdown sale pobre. Probar desde ya con PDFs reales de los cursos y mostrar al docente la vista previa del `.md` (§2.5).
- **Documentos largos.** Un PDF de 80 páginas no entra bien en un solo prompt. Dividir el `.md` por semana o por sección antes del LLM 1.
- **Respuestas inválidas del modelo.** Siempre validar con zod, reintentar una vez y, si vuelve a fallar, marcar el reto como "No se pudo generar". El docente revisa todo antes de publicar (gobernanza docente, uno de los diferenciadores del benchmark).
- **Costos.** Generar por lote al subir el material y guardar el resultado; nunca generar por estudiante ni durante el juego. Poner un límite de gasto en el gateway.
- **Arranque en frío de Cloud Run.** Ver §2.4. Mostrar siempre un skeleton, nunca una pantalla en blanco.
- **Versiones.** Fijar versiones exactas en `package.json` y `requirements.txt` al iniciar el repo y actualizarlas solo en PRs dedicados.

---

## 3. Dirección visual y marca

**Concepto: "Modo reto", negro + naranja.** La paleta sigue la del logotipo: negro para concentrarse y naranja mandarina para la energía y la competencia. Transmite urgencia, que encaja con retos de pocos segundos, y es cálida. Además se diferencia en edtech, donde dominan los azules y violetas.

| Color | Hex | Rol |
| --- | --- | --- |
| Negro | `#121212` / `#1E1E1E` | Fondo y tarjetas: todo el foco en el contenido |
| Naranja mandarina | `#FF6B2C` | Marca, botones, selección y foco |
| Amarillo | `#FFD23F` | Leaderboard, puntos, rachas y logros |
| Verde suave | `#7EE081` | Acierto |
| Rosa-rojo | `#FF4D6D` | Temporizador y error |
| Crema | `#FFF4EA` | Cuerpo del cuy, nombre del logotipo y texto principal |
| Chocolate | `#7A4E36` | Tercer color del cuy. Solo en ilustración: no tiene contraste suficiente para texto |

**De las plantillas de referencia se toma la composición, no la paleta.**

| Referencia | Qué tomamos | Qué no tomamos |
| --- | --- | --- |
| Bosque nocturno (plantilla 1) | Tarjetas con glow suave, barra de navegación tipo píldora | Paleta violeta, texto pequeño y denso |
| Paisaje espacial (plantilla 2) | Íconos en contenedores cuadrados redondeados, titulares grandes y limpios | Fondos índigo, CTA verde menta |
| Cards de aventura (plantilla 3) | **Tarjetas de selección numeradas (01, 02, 03)** → selector de minijuegos y semanas | Tipografía condensada en mayúsculas para todo |
| Landing ilustrada (plantilla 4) | Timeline numerado vertical ("How it works") → progreso por semana del sílabo; secciones con ilustración + texto alternados | Exceso de secciones de marketing |

**Reglas de aplicación**

- Tema **oscuro por defecto**. El tema claro se define en tokens (§4.2) para el panel docente y para quien lo prefiera.
- **Naranja = acción. Amarillo = recompensa.** Nunca un botón amarillo ni puntos en naranja.
- El texto sobre naranja o amarillo siempre es oscuro (`#121212`): el blanco sobre `#FF6B2C` no llega al contraste mínimo (≈ 2.8:1).
- Naranja y rosa-rojo son cercanos: el temporizador y los errores siempre llevan ícono y texto, nunca solo color.
- El glow naranja se usa con moderación: solo en el elemento seleccionado, el botón principal en foco y las celebraciones.
- Ilustraciones solo en: onboarding, estados vacíos, pantalla de resultados, perfil y landing. **Nunca dentro del área de interacción del juego.** La única excepción es el cuy frontal, en los momentos de §3.2.

### 3.1 Marca: el cuy

El cuy tiene dos papeles que no se intercambian: **de perfil es la marca** (identifica al producto) y **de frente es el personaje** (acompaña al estudiante durante las dinámicas de los minijuegos).

| | Cuy de perfil | Cuy frontal |
| --- | --- | --- |
| Papel | Marca principal | Personaje que reacciona |
| Expresión | Siempre la misma | Cambia según lo que pasa en el reto |
| Dónde | Fuera de los juegos: navegación, login, favicon, documentos, landing, carga inicial | Dentro del flujo del reto: intro, feedback, resultado y esperas |
| Componente | `<Logo />` | `<CuyFrontal expresion="…" />` |

**Piezas del logotipo (lámina "Logo Cuy v3")**

| Pieza | Cómo es | Dónde se usa en el producto |
| --- | --- | --- |
| Logotipo principal | Cuy tricolor de perfil con birrete + nombre en Archivo Black (crema) + lema "Ponte a prueba." en naranja | Login, landing para universidades, pantalla de carga inicial, portada de documentos y presentaciones |
| Logotipo compacto | Cuy de perfil de 32 px + nombre en Archivo Black de 18 px, sin lema | Arriba de la barra lateral en desktop |
| Ícono de app | Cuy de perfil sobre un cuadrado negro redondeado, sobre fondo naranja | Favicon, ícono de la app instalable (PWA), ícono dentro del aula virtual |
| Sobre fondo claro | Cuy dentro de un círculo negro + nombre en negro | Documentos, aula virtual, panel docente en tema claro |
| Monocromo | Silueta naranja del cuy con birrete | Stickers, merch, sellos, marca de agua de reportes y certificados |
| Tamaños pequeños | Silueta + birrete: se pierden detalles, no la forma | 24 px: favicon y pestañas · 48 px: barra lateral colapsada · 96 px: encabezados |

**Reglas del logotipo**

- Espacio libre alrededor del logotipo igual a la altura del birrete; nada de texto ni bordes dentro de ese espacio.
- Tamaño mínimo del logotipo completo: 120 px de ancho. Por debajo de 48 px de alto se usa la versión simplificada.
- Fondos permitidos: negro (`#121212`, `#1E1E1E`) como principal; naranja solo con el cuy dentro del cuadrado negro (ícono de app); crema o blanco solo con la versión del círculo negro.
- El cuy de perfil mira a la derecha, hacia el nombre; no se espeja.
- No se rota, estira ni recolorea, no se le quita el birrete y no lleva sombras, contornos ni degradados encima.
- El nombre del producto sigue pendiente (`[NOMBRE]`): `<Logo />` lo toma de una sola constante para cambiarlo en un solo lugar.

### 3.2 El cuy frontal en los minijuegos

El cuy frontal es el compañero del estudiante dentro de las dinámicas. Se usa cuando hay algo que **comunicarle a la persona**, no para decorar.

**Cuándo se usa el cuy frontal**

- **Al empezar una dinámica:** la intro o cuenta regresiva de un reto, y la invitación a jugar.
- **Al reaccionar a lo que hizo el estudiante:** acertar, fallar, quedarse sin tiempo o usar una pista. Siempre con un tono amable: celebra los aciertos y anima en los errores, nunca se burla ni se muestra decepcionado.
- **Al cerrar una dinámica:** la pantalla de resultado, subir en el ranking, completar una racha o desbloquear un logro.
- **Mientras el estudiante o el docente espera:** cargar un reto, evaluar una respuesta escrita o generar los retos de un material.
- **Cuando no hay nada que jugar:** estados vacíos y el límite semanal alcanzado.

**Cuándo no se usa**

- Mientras corre el temporizador o dentro del área de interacción del juego (principio 5).
- Como marca: en navegación, login, favicon, documentos o landing va el cuy de perfil (§3.1).
- En mensajes de error del sistema (fallos de red, permisos): ahí basta con el texto.

**Reglas del personaje**

- Las expresiones se pueden adaptar a cada situación, pero siempre conservan los rasgos que lo separan del panda (lámina): ojos a los costados, cara partida naranja/chocolate con franja blanca, nariz ancha con labio partido, bigotes y orejas caídas. Solo cambian ojos, boca y accesorios.
- Los accesorios (destellos, puntos) van en amarillo (`reward`); el texto que lo acompaña usa el color del estado (verde en un acierto, por ejemplo).
- El cuy acompaña al texto, nunca lo reemplaza: el mensaje se entiende sin verlo. Es decorativo (`aria-hidden="true"`).
- Tamaño proporcional al momento: pequeño en reacciones rápidas (feedback) y más grande en momentos de cierre o celebración. Una sola aparición por pantalla.
- Sus animaciones siguen §7: breves, sin bloquear la interacción, y sin movimiento con `prefers-reduced-motion`.
- En Ajustes hay un interruptor "Mostrar al cuy durante los retos" (activado por defecto), para quien lo prefiera más sobrio.

**Archivos y componentes**

Los SVG se exportan desde el archivo fuente del logotipo (no desde el PDF) a `apps/web/public/brand/`. El cuy de perfil se usa con `<Logo />` y el frontal con `<CuyFrontal />`, que recibe la situación y elige la ilustración correspondiente; así, agregar o cambiar una expresión no obliga a tocar las pantallas.

---

## 4. Design tokens

Los tokens son la única fuente de verdad. **Está prohibido usar valores hex, px o ms sueltos en componentes**; siempre se usa el token.

### 4.1 Color — tema oscuro (por defecto)

**Superficies**

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-bg` | `#121212` | Fondo de la app |
| `--color-surface` | `#1E1E1E` | Tarjetas, paneles, barra lateral |
| `--color-surface-raised` | `#2A2A2A` | Fichas de juego, sheets, modales |
| `--color-surface-sunken` | `#0A0A0A` | Inputs, barras de progreso vacías, `Kbd` |
| `--color-border` | `#333333` | Bordes por defecto |
| `--color-border-strong` | `#4D4D4D` | Bordes en hover/foco de tarjetas |

**Texto**

| Token | Hex | Uso | Contraste |
| --- | --- | --- | --- |
| `--color-text` | `#FFF4EA` | Texto principal (crema del logotipo) | ≈ 17:1 sobre `bg` |
| `--color-text-secondary` | `#BDBDBD` | Texto de apoyo | ≈ 10:1 sobre `bg` |
| `--color-text-muted` | `#8F8F8F` | Metadatos, placeholders | ≈ 5.7:1 sobre `bg`, ≈ 5.2:1 sobre `surface` |
| `--color-text-on-primary` | `#121212` | Texto sobre naranja, amarillo y colores de categoría | ≈ 6.5:1 sobre `primary` |

**Marca y acción**

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-primary` | `#FF6B2C` | Marca, botón primario, selección, foco |
| `--color-primary-hover` | `#FF8247` | Hover / pressed (se aclara en tema oscuro) |
| `--color-primary-text` | `#FF8A57` | Links y etiquetas en naranja sobre fondo oscuro |
| `--color-primary-soft` | `#FF6B2C1F` (12 %) | Fondos de chips, filas y fichas seleccionadas |
| `--color-primary-glow` | `#FF6B2C59` (35 %) | Glow de foco y de elementos activos |
| `--color-reward` | `#FFD23F` | Leaderboard, puntos, rachas, logros, top 5 |
| `--color-reward-soft` | `#FFD23F1F` | Fondo de badges de recompensa |
| `--color-brand-cream` | `#FFF4EA` | Cuerpo del cuy, nombre en el logotipo |
| `--color-brand-chocolate` | `#7A4E36` | Tercer color del cuy. **Solo ilustración**, nunca texto |

**Estados semánticos**

| Token | Hex | Uso |
| --- | --- | --- |
| `--color-success` | `#7EE081` | Respuesta correcta |
| `--color-success-soft` | `#7EE0811F` | Fondo de feedback correcto |
| `--color-timer` | `#FF4D6D` | Temporizador (barra y número) |
| `--color-error` | `#FF4D6D` | Respuesta incorrecta |
| `--color-error-soft` | `#FF4D6D1F` | Fondo de feedback incorrecto |
| `--color-warning` | `#FFB547` | Avisos que no son error (ej. "Te queda 1 reto esta semana") |
| `--color-info` | `#5CC8FF` | Pistas, tips |

**Colores de categoría (juegos con grupos o parejas)**

Para Parejas, Dos cajas y El intruso. Siempre se acompañan de **forma + letra**, nunca solo color (§14). El texto encima siempre es `text-on-primary` (`#121212`).

| Token | Hex | Forma | Letra |
| --- | --- | --- | --- |
| `--color-cat-1` | `#FF6B2C` | Círculo ● | A |
| `--color-cat-2` | `#FFD23F` | Cuadrado ■ | B |
| `--color-cat-3` | `#7EE081` | Triángulo ▲ | C |
| `--color-cat-4` | `#5CC8FF` | Rombo ◆ | D |
| `--color-cat-5` | `#C792EA` | Estrella ★ | E |

**Degradados permitidos** (solo fondos decorativos y celebraciones, nunca detrás de texto pequeño)

```css
--gradient-surface: linear-gradient(180deg, #1E1E1E 0%, #121212 100%); /* fondos de sección */
--gradient-ember:   linear-gradient(135deg, #FF6B2C 0%, #FF4D6D 100%); /* hero, pantalla de resultado */
--gradient-reward:  linear-gradient(135deg, #FFD23F 0%, #FF6B2C 100%); /* botón reward, logros */
```

### 4.2 Color — tema claro

Mismos nombres de token, distintos valores. Los componentes no cambian.

| Token | Hex | Nota |
| --- | --- | --- |
| `--color-bg` | `#FAFAFA` | |
| `--color-surface` | `#FFFFFF` | |
| `--color-surface-raised` | `#FFFFFF` | |
| `--color-surface-sunken` | `#F0F0F0` | |
| `--color-border` | `#E3E3E3` | |
| `--color-border-strong` | `#C7C7C7` | |
| `--color-text` | `#121212` | |
| `--color-text-secondary` | `#4A4A4A` | |
| `--color-text-muted` | `#6B6B6B` | |
| `--color-primary` | `#C2410C` | Naranja más oscuro: sobre blanco, el `#FF6B2C` no alcanza contraste para texto |
| `--color-primary-hover` | `#A8380A` | |
| `--color-primary-text` | `#C2410C` | |
| `--color-text-on-primary` | `#FFFFFF` | ≈ 5.2:1 sobre `#C2410C` |
| `--color-reward` | `#FFD23F` | Solo como relleno, con texto oscuro encima |
| `--color-success` | `#1E7B34` | |
| `--color-timer` | `#C9184A` | |
| `--color-error` | `#C9184A` | |
| `--color-warning` | `#A15C00` | |
| `--color-info` | `#0B6FA4` | |

### 4.3 Espaciado (base 4, siempre números pares)

| Token | px | Uso típico |
| --- | --- | --- |
| `--space-1` | 4 | Separación ícono–texto |
| `--space-2` | 8 | Gap interno de chips |
| `--space-3` | 12 | Padding de botones pequeños |
| `--space-4` | 16 | Padding de tarjetas en móvil, gutter lateral |
| `--space-5` | 20 | — |
| `--space-6` | 24 | Padding de tarjetas en desktop |
| `--space-8` | 32 | Separación entre secciones (móvil) |
| `--space-10` | 40 | — |
| `--space-12` | 48 | Separación entre secciones (desktop) |
| `--space-16` | 64 | Márgenes de página grandes |

### 4.4 Radios

| Token | px | Uso |
| --- | --- | --- |
| `--radius-sm` | 8 | Chips, inputs pequeños, badges |
| `--radius-md` | 12 | Botones, inputs |
| `--radius-lg` | 16 | Tarjetas, fichas de juego |
| `--radius-xl` | 24 | Sheets, modales, tarjeta de resultados |
| `--radius-full` | 9999 | Píldoras, avatares, navegación inferior |

### 4.5 Bordes y elevación

En tema oscuro la elevación se comunica con **superficie más clara + borde + glow**, no con sombras negras.

| Token | Valor | Uso |
| --- | --- | --- |
| `--border-width` | 1px | Por defecto |
| `--border-width-strong` | 2px | Elemento seleccionado, foco |
| `--shadow-sm` | `0 2px 8px #00000040` | Botones |
| `--shadow-md` | `0 8px 24px #00000059` | Tarjetas elevadas |
| `--shadow-lg` | `0 16px 48px #00000073` | Modales, sheets |
| `--glow-primary` | `0 0 0 4px var(--color-primary-glow)` | Foco visible, ficha seleccionada |
| `--glow-success` | `0 0 24px #7EE08166` | Acierto |
| `--glow-reward` | `0 0 24px #FFD23F66` | Racha, logro desbloqueado, subir en el ranking |

### 4.6 Z-index

| Token | Valor |
| --- | --- |
| `--z-base` | 0 |
| `--z-sticky` | 10 |
| `--z-nav` | 20 |
| `--z-overlay` | 40 |
| `--z-modal` | 50 |
| `--z-toast` | 60 |

### 4.7 Implementación en Tailwind v4

`src/styles/tokens.css`:

```css
@import "tailwindcss";

@theme {
  /* Color — tema oscuro por defecto (negro + naranja) */
  --color-bg: #121212;
  --color-surface: #1E1E1E;
  --color-surface-raised: #2A2A2A;
  --color-surface-sunken: #0A0A0A;
  --color-border: #333333;
  --color-border-strong: #4D4D4D;
  --color-text: #FFF4EA;
  --color-text-secondary: #BDBDBD;
  --color-text-muted: #8F8F8F;
  --color-text-on-primary: #121212;
  --color-primary: #FF6B2C;
  --color-primary-hover: #FF8247;
  --color-primary-text: #FF8A57;
  --color-reward: #FFD23F;
  --color-success: #7EE081;
  --color-timer: #FF4D6D;
  --color-error: #FF4D6D;
  --color-warning: #FFB547;
  --color-info: #5CC8FF;
  --color-cat-1: #FF6B2C;
  --color-cat-2: #FFD23F;
  --color-cat-3: #7EE081;
  --color-cat-4: #5CC8FF;
  --color-cat-5: #C792EA;
  --color-brand-cream: #FFF4EA;
  --color-brand-chocolate: #7A4E36;

  /* Tipografía */
  --font-display: "Sora", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Radios */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Movimiento */
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

[data-theme="light"] {
  --color-bg: #FAFAFA;
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;
  --color-surface-sunken: #F0F0F0;
  --color-border: #E3E3E3;
  --color-border-strong: #C7C7C7;
  --color-text: #121212;
  --color-text-secondary: #4A4A4A;
  --color-text-muted: #6B6B6B;
  --color-text-on-primary: #FFFFFF;
  --color-primary: #C2410C;
  --color-primary-hover: #A8380A;
  --color-primary-text: #C2410C;
  --color-success: #1E7B34;
  --color-timer: #C9184A;
  --color-error: #C9184A;
  --color-warning: #A15C00;
  --color-info: #0B6FA4;
}
```

Uso: `className="bg-surface text-text rounded-lg border border-border"`.

---

## 5. Tipografía

**Familias** (todas en Google Fonts, cargadas con `next/font` para evitar saltos de layout; todas soportan tildes y ñ):

| Rol | Fuente | Por qué |
| --- | --- | --- |
| Logotipo | **Archivo Black** | Solo para el nombre del producto dentro del logotipo (§3.1). Nunca en la UI. |
| Display (titulares, números grandes, puntaje) | **Sora** (600–700) | Geométrica y amistosa, cercana a la plantilla espacial; los números se ven bien grandes. |
| Texto (UI, enunciados, feedback) | **Inter** (400–600) | Máxima legibilidad en pantalla, tanto en laptop como en celular. |
| Código y fórmulas | **JetBrains Mono** (400–500) | Para "Encuentra el error" y cursos de programación. |

**Escala tipográfica** (solo números pares, según recomendación del mentor: 14–16 px en web y 12–14 px en móvil). La columna **Desktop** es la de referencia para diseñar; la de móvil es la reducción.

| Token | Desktop ≥1024 px (px / line-height) | Tablet y móvil <1024 px | Fuente / peso | Uso |
| --- | --- | --- | --- | --- |
| `display-xl` | 56 / 64 | 40 / 48 | Sora 700 | Puntaje final, hero de landing |
| `display` | 40 / 48 | 32 / 40 | Sora 700 | Título de pantalla de resultados |
| `h1` | 32 / 40 | 24 / 32 | Sora 600 | Título de página |
| `h2` | 24 / 32 | 20 / 28 | Sora 600 | Título de sección |
| `h3` | 20 / 28 | 18 / 26 | Inter 600 | Título de tarjeta |
| `prompt` | 24 / 32 | 18 / 28 | Inter 500 | **Enunciado de un reto** |
| `body-lg` | 18 / 28 | 16 / 24 | Inter 400 | Texto de fichas de juego |
| `body` | 16 / 24 | 14 / 22 | Inter 400 | Texto general |
| `label` | 14 / 20 | 14 / 20 | Inter 600 | Botones, etiquetas |
| `caption` | 12 / 16 | 12 / 16 | Inter 500 | Metadatos. **Nunca para contenido del reto.** |
| `code` | 16 / 24 | 14 / 22 | JetBrains Mono 400 | Líneas de código |
| `kbd` | 12 / 16 | — (oculto) | JetBrains Mono 500 | Atajos de teclado en fichas y botones (§11.5) |

**Reglas**

- Mínimo absoluto: 12 px y solo para metadatos. Contenido de un reto: mínimo 18 px en desktop y 16 px en móvil.
- Ancho de línea máximo: 65 caracteres (`max-w-prose`).
- Números que cambian (puntaje, temporizador): `font-variant-numeric: tabular-nums` para que no "bailen".
- Sin texto en MAYÚSCULAS para párrafos; solo para `caption` de etiquetas cortas (ej. "SEMANA 5"), con `letter-spacing: 0.08em`.

---

## 6. Layout, grid y responsive

### 6.0 Base de diseño vs. estrategia de CSS

Son dos decisiones distintas y conviene no mezclarlas:

| | Decisión | Qué significa en la práctica |
| --- | --- | --- |
| **Base de diseño** | **Desktop (1280 × 720)** | Los bocetos, mockups y revisiones parten de la versión laptop. Es la versión que se presenta al jurado y a las universidades. |
| **Estrategia de CSS** | **Mobile-first de Tailwind** (se mantiene) | En el código, las clases sin prefijo aplican a móvil y se agregan `md:` / `lg:` para pantallas más grandes. Es como funciona Tailwind y evita pelear con la librería. |

Ejemplo: un diseño hecho a 1280 px con dos columnas se codifica como `grid grid-cols-1 lg:grid-cols-12`. El diseño manda; el CSS solo es la forma de escribirlo.

**Resoluciones de referencia**

| Resolución | Por qué |
| --- | --- |
| **1280 × 720** | Base de diseño. Área útil típica de una laptop con el navegador abierto. |
| 1366 × 768 | La laptop más común entre estudiantes; validar que nada se corte (área útil ≈ 1366 × 650). |
| 1440 × 900 / 1920 × 1080 | Monitores grandes: el contenido se limita a 1200 px y se centra. |
| 768 × 1024 | Tablet vertical. |
| 390 × 844 | Celular de referencia (validar también 360 × 640). |

### 6.1 Breakpoints

| Nombre (Tailwind) | Desde | Dispositivo objetivo | Columnas | Gutter lateral |
| --- | --- | --- | --- | --- |
| `xl` | 1280 | **Desktop (base de diseño)** | 12 | 32 px (contenido máx. 1200 px) |
| `lg` | 1024 | Laptop pequeña / tablet horizontal | 12 | 32 px |
| `md` | 768 | Tablet vertical | 8 | 24 px |
| `sm` | 640 | Celular grande / horizontal | 4 | 20 px |
| base | 0 | Celular | 4 | 16 px |

### 6.2 Patrones de navegación

| Dispositivo | Navegación |
| --- | --- |
| Desktop y laptop (≥1024) | **Barra lateral izquierda** de 240 px con logo, los 4 destinos (Inicio, Jugar, Ranking, Perfil) y el curso activo. Colapsable a 72 px (solo íconos) entre 1024 y 1279 px. |
| Tablet (768–1023) | Barra lateral colapsada de 72 px. |
| Móvil (<768) | **Barra inferior tipo píldora** (inspirada en la plantilla 1) con los mismos 4 destinos. Altura 64 px + `safe-area-inset-bottom`. |
| Durante un reto | **Sin navegación global** en ningún tamaño. Solo el `GameShell` (§11.2), para no distraer ni invitar a salir. |

### 6.3 Layout de las pantallas principales en desktop

| Pantalla | Desktop (≥1280) | Tablet | Móvil |
| --- | --- | --- | --- |
| Inicio | Sidebar + contenido en 12 columnas: **8 col.** con saludo, tarjeta del curso y retos de la semana; **4 col.** con ranking y logros | Una columna; ranking debajo | Una columna; ranking resumido a 3 filas |
| Curso | 8 col. con semana actual y botón Jugar; 4 col. con timeline de semanas | Timeline debajo | Timeline en acordeón |
| Ranking | Podio arriba + tabla completa (puesto, nombre, puntos, racha, retos) | Tabla sin columna de racha | Lista de filas |
| Reto | `GameShell` sin sidebar, área de juego centrada (§6.4) | Igual, más angosta | Pantalla completa |
| Resultado | Dos columnas: izquierda puntaje y estrellas; derecha explicación y ranking | Una columna centrada de 640 px | Una columna |

### 6.4 Área de juego

- Ancho máximo del área de juego en desktop: **960 px**, centrada. Fuera de ella solo el fondo `--color-bg`, sin contenido adicional.
- Altura: el reto completo (enunciado + interacción + botón) debe caber **sin scroll en 1280 × 720** y en **1366 × 650** de área útil. En móvil debe caber en 390 × 844; si no cabe, se reduce la cantidad de fichas de ese nivel, no el tamaño de fuente.
- Las fichas aprovechan el ancho: en desktop, Parejas usa dos columnas de ≈440 px; El intruso, 4 fichas en una fila; ¿Cuál es mayor?, dos tarjetas lado a lado.
- Usar `100dvh` (no `100vh`) para evitar saltos con la barra del navegador móvil.

### 6.5 Mapa de pantallas

| Ruta | Pantalla | Rol |
| --- | --- | --- |
| `/login` | Ingreso con correo institucional | Todos |
| `/inicio` | Resumen: racha, retos restantes esta semana, cursos, posición en ranking | Estudiante |
| `/cursos/[courseId]` | Semana actual del sílabo, timeline de semanas (patrón plantilla 4), botón "Jugar" | Estudiante |
| `/cursos/[courseId]/jugar` | Selección/arranque de reto (tarjetas numeradas, patrón plantilla 3) | Estudiante |
| `/reto/[sessionId]` | `GameShell` + minijuego | Estudiante |
| `/reto/[sessionId]/resultado` | Resultado del reto | Estudiante |
| `/cursos/[courseId]/ranking` | Leaderboard de la sección | Estudiante / Docente |
| `/perfil` | Logros, insignias, estadísticas del ciclo | Estudiante |
| `/docente/cursos/[courseId]` | Carga de sílabo y PDFs, revisión de ejercicios, analíticas | Docente |

---

## 7. Movimiento y animaciones

El mentor pidió animaciones acordes al público: **breves y funcionales**. Cada animación debe responder a una de estas preguntas: ¿confirma una acción?, ¿muestra un cambio de estado?, ¿celebra un logro?

### 7.1 Tokens

| Token | Valor | Uso |
| --- | --- | --- |
| `--duration-instant` | 100 ms | Pressed de botón |
| `--duration-fast` | 160 ms | Hover, selección de ficha |
| `--duration-base` | 240 ms | Entrada de feedback, cambio de pantalla |
| `--duration-slow` | 400 ms | Sheet de resultado, contador de puntos |
| `--duration-celebrate` | 800 ms | Máximo para cualquier celebración |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entradas |
| `--ease-in` | `cubic-bezier(0.64, 0, 0.78, 0)` | Salidas |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Fichas que "encajan", puntos que aparecen |

### 7.2 Catálogo de animaciones permitidas

| Evento | Animación | Duración |
| --- | --- | --- |
| Presionar botón | Escala 0.97 | instant |
| Seleccionar ficha | Borde `primary` + `glow-primary` | fast |
| Ficha encaja en su lugar | Escala 1.05 → 1 con spring | base |
| Respuesta correcta | Glow verde + check que dibuja su trazo + "+10" que sube y se desvanece | base |
| Respuesta incorrecta | Sacudida horizontal de 6 px, 2 ciclos | base |
| Temporizador crítico | Pulso de opacidad en el número | 1 s en bucle |
| Sheet de feedback | Desliza desde abajo | base |
| Fin de reto | Estrellas aparecen una por una (stagger 120 ms) + contador de puntos | slow |
| Logro / racha | Badge con `glow-reward` + confetti breve | celebrate |

**Prohibido:** animaciones de más de 800 ms que bloqueen la interacción, parallax dentro del área de juego, confetti en cada acierto (solo al final del reto o en logros).

### 7.3 Movimiento reducido

Respetar `prefers-reduced-motion: reduce`: se reemplazan desplazamientos y escalas por cambios de opacidad, y se elimina el confetti. Con Motion: `useReducedMotion()`.

---

## 8. Iconografía e ilustración

### 8.1 Iconos

- Librería: **lucide-react**, trazo 2 px.
- Tamaños: 16 (en texto), 20 (botones), 24 (navegación), 32 (tarjetas de juego dentro de contenedor).
- Contenedor de ícono destacado (patrón plantilla 2): cuadrado 48 × 48, `radius-md`, fondo `primary-soft`, ícono `primary`.
- Botones solo con ícono deben tener `aria-label`.

**Iconos asignados (no cambiar sin actualizar este documento)**

| Concepto | Ícono lucide |
| --- | --- |
| Puntos | `Sparkles` |
| Racha | `Flame` |
| Temporizador | `Timer` |
| Pista | `Lightbulb` |
| Leaderboard | `Trophy` |
| Logros | `Medal` |
| Retos semanales restantes | `Zap` |
| Correcto | `CircleCheck` |
| Incorrecto | `CircleX` |
| Salir del reto | `X` |

### 8.2 Iconos de minijuegos

Cada minijuego tiene un ícono y un color de acento fijo, que se usan en tarjetas de selección, resultados y perfil:

| Juego | Ícono lucide | Acento |
| --- | --- | --- |
| Desliza | `ArrowLeftRight` | `cat-1` |
| Parejas | `Link2` | `cat-2` |
| Ordena | `ListOrdered` | `cat-3` |
| Dos cajas | `Columns2` | `cat-4` |
| Hueco | `TextCursorInput` | `cat-5` |
| Encuentra el error | `Bug` | `cat-1` |
| ¿Quién soy? | `UserRoundSearch` | `cat-2` |
| El intruso | `ShieldQuestion` | `cat-3` |
| ¿Cuál es mayor? | `Scale` | `cat-4` |
| Explícalo en una frase | `MessageSquareText` | `cat-5` |

### 8.3 Ilustración

Estilo: **ilustración plana con luz cálida**: escenas sobre fondo casi negro, con el naranja como fuente de luz principal y destellos amarillos, texturas suaves y sin contornos negros. De las plantillas se toma la técnica, no sus colores.

Dónde se usan: onboarding, estados vacíos ("Aún no hay retos esta semana"), pantalla de resultados, perfil, landing para universidades. **Nunca en el área de juego.**

Si se generan con IA, usar siempre el mismo prompt base para mantener coherencia:

```
Flat vector illustration, near-black background (#121212, #1E1E1E), tangerine orange (#FF6B2C)
as the main light source, warm yellow (#FFD23F) highlights, small touches of soft green (#7EE081),
soft grain texture, no black outlines, energetic and competitive mood, university student theme,
[ESCENA], no text.
```

Formato: SVG o WebP, servido con `next/image`. Todas con `alt` descriptivo o `alt=""` si son decorativas.

---

## 9. Componentes base (UI kit)

Todos viven en `src/components/ui/` y tienen historia en Storybook. Ningún juego crea su propio botón, tarjeta o modal.

### 9.1 Button

| Variante | Fondo | Texto | Uso |
| --- | --- | --- | --- |
| `primary` | `primary` | `text-on-primary` (`#121212` en tema oscuro) | Acción principal: "Comprobar", "Jugar", "Continuar". **Una por pantalla.** |
| `secondary` | `surface-raised` + borde `border-strong` | `text` | Acciones alternativas |
| `ghost` | transparente | `text-secondary` | Acciones terciarias, "Saltar" |
| `reward` | `gradient-reward` | `text-on-primary` | Reclamar recompensa, usar booster |
| `danger` | `error-soft` | `error` | Salir del reto (confirmación) |

| Tamaño | Alto | Padding X | Texto |
| --- | --- | --- | --- |
| `sm` | 36 px | 12 px | label 14 |
| `md` | 44 px | 16 px | label 14 |
| `lg` | 52 px | 24 px | label 16 — **botón de acción de juego**: en desktop ancho mínimo 240 px alineado a la derecha y con su atajo (`Enter`); en móvil ancho completo |

Estados obligatorios: default, hover, pressed, focus-visible (`glow-primary`), disabled (opacidad 40 %, sin cursor), loading (spinner + texto se mantiene para que no cambie el ancho).

### 9.2 Card

- Fondo `surface`, borde `border`, `radius-lg`, padding 16 (móvil) / 24 (desktop).
- Variante `interactive`: hover → borde `border-strong` + subir 2 px.
- Variante `numbered` (patrón plantilla 3): número grande "01" en `display` con color de acento, título, descripción y botón. Se usa para elegir juego y para semanas.

### 9.3 Otros componentes base

| Componente | Notas |
| --- | --- |
| `Input`, `Textarea` | Alto 44 px, `radius-md`, fondo `surface-sunken`, borde que cambia a `primary` en foco. Contador de caracteres en `Textarea` (Explícalo en una frase). |
| `Badge` | `radius-sm`, `caption`. Variantes: `neutral`, `primary`, `reward`, `success`, `error`. |
| `Chip` | Seleccionable, `radius-full`, alto 32 px. |
| `ProgressBar` | Alto 8 px, `radius-full`, fondo `surface-sunken`, relleno según variante. |
| `Avatar` | 32 / 40 / 64 px, iniciales si no hay foto. |
| `Sheet` | Radix Dialog. En desktop, panel inferior del área de juego (mismo ancho de 960 px, sin cubrir toda la pantalla); en móvil, bottom sheet con `radius-xl` arriba. Para feedback de respuesta. |
| `Kbd` | Etiqueta de atajo de teclado: `radius-sm`, fondo `surface-sunken`, borde `border`, fuente `kbd`. Solo visible en ≥1024 px. |
| `Dialog` | Para confirmaciones ("¿Salir del reto? Perderás este intento"). |
| `Toast` | Arriba-centro en móvil, abajo-derecha en desktop. 4 s. |
| `Skeleton` | Shimmer suave en `surface-raised`. **Obligatorio en toda carga**, nunca pantalla vacía. |
| `EmptyState` | Ilustración + título + texto + acción. |
| `Tooltip` | Solo para información no esencial. Útil en desktop (hover), pero nada importante puede depender de él porque en móvil no hay hover. |

---

## 10. Componentes de gamificación

Inspirados en Duolingo y TryHackMe (benchmark §5). Viven en `src/components/gamification/`.

| Componente | Descripción | Datos |
| --- | --- | --- |
| `PointsCounter` | Ícono `Sparkles` + número en `reward`. Anima el incremento contando. | `points` |
| `StreakBadge` | Ícono `Flame` + días. Apagado (`text-muted`) si la racha está en 0; con `glow-reward` si está activa. | `streakDays`, `isActiveToday` |
| `WeeklyQuota` | 10 segmentos (uno por reto semanal), llenos los jugados. Texto "7 de 10 retos esta semana". | `played`, `limit` |
| `LeaderboardRow` | Posición, avatar, nombre, puntos. Top 3 con medalla; top 5 con borde `reward` (premio del docente). La fila del usuario siempre resaltada con `primary-soft` y fijada abajo si no está visible. | `rank`, `user`, `points`, `isMe` |
| `LeaderboardPodium` | Top 3 en podio en la parte superior del ranking. | — |
| `AchievementBadge` | Insignia circular, bloqueada en escala de grises con candado. | `achievement`, `unlocked` |
| `StarRating` | 1–3 estrellas de resultado (patrón Platzi). | `stars` |
| `WeekTimeline` | Timeline vertical numerado de semanas del sílabo (patrón plantilla 4): pasadas ✓, actual destacada, futuras bloqueadas. | `weeks`, `currentWeek` |
| `BoosterChip` *(futuro)* | "×2 puntos" con `gradient-reward`. | `multiplier`, `expiresAt` |

---

## 11. Arquitectura común de los minijuegos

Esta sección es la que permite que cada integrante trabaje un juego por separado sin romper la consistencia.

### 11.1 El "átomo" de contenido

El **átomo** es la unidad de contenido que los prompts del paso ⑤ (§2.1) le piden al modelo por cada concepto del `.md`, y de sus campos salen los `args` de cada plantilla (§2.2). En la v1 no se guarda como tabla aparte: es la referencia común para escribir los prompts. Todos los juegos consumen el mismo tipo; cada juego toma los campos que necesita (tabla de plantillas).

```ts
// src/games/types.ts
export interface Atom {
  id: string;
  concepto: string;              // "Mitosis"
  definicion: string;            // Definición correcta en una frase
  confusiones: string[];         // Afirmaciones falsas típicas / errores comunes
  pasos?: string[];              // Procedimiento ordenado
  categoria?: string;            // Para Dos cajas
  relacionados: string[];        // Conceptos de la misma unidad
  ejemplos?: string[];           // Para ¿Quién soy?
  valor?: { cantidad: number; unidad: string; etiqueta: string }; // Para ¿Cuál es mayor?
  fuente: { documento: string; pagina?: number; fragmento: string };
  semana: number;
  difficulty: "baja" | "media" | "alta";
}
```

> Importante: el cliente **no** recibe átomos completos durante un reto. Recibe un `ChallengePayload` ya armado por el backend, sin la respuesta correcta (§17).

### 11.2 GameShell (obligatorio para todos los juegos)

Todo minijuego se renderiza dentro de `GameShell`. El juego **solo** implementa el área central.

**Desktop (base, 1280 × 720)**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [X Salir  Esc]        🔗 Parejas · Semana 5 · Nivel 2          ✨ 1 250 · 🔥 5 │ ← GameHeader (64 px, ancho completo)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    ⏱ 0:18 │ ← GameTimer (barra de ancho completo)
├──────────────────────────────────────────────────────────────────────────────┤
│              ┌──────────── área de juego · máx. 960 px ────────────┐         │
│              │ Une cada concepto con su definición                 │         │ ← GamePrompt (24 px)
│              │                                                     │         │
│              │          [ ÁREA DEL MINIJUEGO ]                     │         │ ← children (lo único que
│              │                                                     │         │   implementa cada juego)
│              ├─────────────────────────────────────────────────────┤         │
│              │ 💡 Pista (−5 pts) [H]     2 de 4 pares   [Comprobar ⏎]│        │ ← GameFooter en una fila
│              └─────────────────────────────────────────────────────┘         │
│                  Atajos: 1–4 conceptos · A–D definiciones · Esc salir        │ ← Leyenda de atajos (caption)
└──────────────────────────────────────────────────────────────────────────────┘
```

**Móvil (adaptación, 390 × 844)**

```
┌──────────────────────────────────────┐
│ [X]   Parejas · Semana 5      ✨ 120 │  ← GameHeader (56 px)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░   0:18   │  ← GameTimer
├──────────────────────────────────────┤
│  Une cada concepto con su definición │  ← GamePrompt (18 px)
│         [ ÁREA DEL MINIJUEGO ]       │
├──────────────────────────────────────┤
│  💡 Pista (−5 pts)                   │  ← GameFooter apilado,
│  [          Comprobar          ]     │     botón ancho completo
└──────────────────────────────────────┘
```

Al responder, el `FeedbackSheet` aparece **reemplazando el GameFooter** en desktop (dentro del área de 960 px, sin tapar las fichas, para que se vea qué estuvo bien y qué no) y como bottom sheet en móvil. El `FeedbackSheet`, el `ResultScreen` y la intro del reto pueden mostrar al cuy frontal (§3.2); el área de interacción nunca lo muestra.

| Pieza | Responsabilidad | La implementa |
| --- | --- | --- |
| `GameHeader` | Salir (con confirmación), nombre del juego, semana, puntos actuales | Shell |
| `GameTimer` | Barra + número, cambia de color por umbral, anuncia a lectores de pantalla | Shell |
| `GamePrompt` | Enunciado del reto | Shell |
| Área central | Mecánica del juego | **Cada juego** |
| `GameFooter` | Botón de pista y botón de acción principal | Shell (el juego le dice si la respuesta está lista) |
| `FeedbackSheet` | Resultado, explicación, puntos, "Continuar" | Shell |
| `ResultScreen` | Estrellas, tiempo, puntos, racha, retos restantes | Shell |

**Ubicación del temporizador.** El benchmark sugiere el temporizador abajo (patrón Platzi). Se ubica **arriba**, bajo el header y de ancho completo: en desktop es lo primero que ve el ojo al entrar al reto y la barra larga hace evidente el paso del tiempo; en móvil, la zona inferior la ocupa el botón de acción y el teclado virtual (en Hueco o Explícalo) taparía un temporizador inferior.

**Umbrales del temporizador**

| Tiempo restante | Color | Comportamiento |
| --- | --- | --- |
| > 20 % | `timer` | Barra y número siempre visibles |
| < 20 % | `timer` | Número con pulso, barra más gruesa (10 → 12 px) y anuncio "Quedan 5 segundos" |
| 0 | — | Se envía lo que haya (o vacío) y se muestra feedback como incorrecto, sin penalización |

El color del temporizador es fijo (`timer`, rosa-rojo) para reconocerlo de un vistazo, como en el patrón de Platzi. La urgencia final se comunica con movimiento y con el anuncio, no cambiando de color.

### 11.3 Contrato de un minijuego

Cada juego exporta una definición que se registra en un catálogo central. Así el shell puede renderizar cualquier juego sin conocerlo.

```ts
// src/games/types.ts
// Igual al campo "type" de las plantillas (§2.2)
export type GameSlug =
  | "verdadero_falso" | "emparejar" | "ordenar_pasos" | "clasificar" | "completar_oraciones"
  | "encontrar_error" | "quien_soy" | "intruso" | "comparar_valor" | "explicar_frase";

export interface GameProps<TPayload, TAnswer> {
  payload: TPayload;                       // Datos del reto (sin solución)
  difficulty: "baja" | "media" | "alta";
  disabled: boolean;                       // true cuando el tiempo terminó o ya se envió
  hintRevealed: boolean;
  mode: "play" | "preview";                // preview: revisión del docente (§2.5), sin temporizador ni envío
  onAnswerChange: (answer: TAnswer | null, isComplete: boolean) => void;
  onSubmit: (answer: TAnswer) => void;     // Para juegos que se envían solos (ej. Desliza)
}

export interface GameDefinition<TPayload, TAnswer> {
  slug: GameSlug;
  name: string;                            // "Parejas"
  instruction: string;                     // "Une cada concepto con su definición"
  icon: LucideIcon;
  accent: `cat-${1 | 2 | 3 | 4 | 5}`;
  payloadSchema: ZodType<TPayload>;        // Importado de packages/game-templates (§2.2)
  answerSchema: ZodType<TAnswer>;          // Valida lo que se envía al API
  submitMode: "button" | "auto";           // "auto": se envía al completar la interacción
  Component: React.ComponentType<GameProps<TPayload, TAnswer>>;
}
```

```ts
// src/games/registry.ts
import { emparejar } from "./emparejar";
import { ordenar_pasos } from "./ordenar_pasos";
// ...
export const gameRegistry = { emparejar, ordenar_pasos /* ... */ } satisfies Record<GameSlug, GameDefinition<any, any>>;
```

**Reglas del contrato**

- Un juego **no** llama al API, **no** maneja el temporizador, **no** calcula puntos y **no** muestra feedback. Solo reporta la respuesta con `onAnswerChange` / `onSubmit`.
- Un juego **no** importa nada de otro juego. Lo compartido va a `src/components/game/`.
- Un juego debe funcionar con mouse, táctil **y teclado**.
- Un juego debe tener historias en Storybook para: dificultad 1, 2 y 3; estado `disabled`; pista revelada; contenido largo (textos de 200 caracteres).

### 11.4 Fichas (`GameTile`)

La unidad visual compartida por casi todos los juegos.

| Propiedad | Valor |
| --- | --- |
| Alto mínimo | 64 px en desktop; 48 px en móvil (objetivo táctil) |
| Padding | 16 × 20 px en desktop; 12 × 16 px en móvil |
| Fondo | `surface-raised` |
| Borde | 1 px `border`, `radius-lg` |
| Texto | `body-lg`, máximo 3 líneas con elipsis y tooltip/expandir |
| Atajo | `Kbd` en la esquina (`1`, `2`, `A`, `B`…), solo en ≥1024 px |

| Estado | Estilo |
| --- | --- |
| `idle` | Por defecto |
| `hover` | Borde `border-strong` |
| `selected` | Borde 2 px `primary` + `glow-primary` + fondo `primary-soft` |
| `dragging` | `shadow-lg` + rotación 2° + escala 1.03 |
| `matched` / `placed` | Borde 2 px del color de categoría + forma/letra |
| `correct` (tras feedback) | Borde `success` + ícono check |
| `incorrect` (tras feedback) | Borde `error` + ícono X + muestra la respuesta correcta debajo |
| `disabled` | Opacidad 50 % |

### 11.5 Atajos de teclado

En laptop el teclado es la forma más rápida de jugar, y con un temporizador corto eso importa. Los atajos los gestiona el `GameShell` con un solo hook (`useGameHotkeys`), activos solo mientras el reto está en curso y nunca cuando el foco está en un campo de texto.

**Atajos globales del shell**

| Tecla | Acción |
| --- | --- |
| `Enter` | Comprobar / Continuar |
| `H` | Usar pista (pide confirmación con un segundo `H` o `Enter`) |
| `Esc` | Salir del reto (abre el diálogo de confirmación) |
| `Tab` / `Shift+Tab` | Mover el foco entre fichas |

**Atajos por juego**

| Juego | Teclas |
| --- | --- |
| Desliza | `←` falso · `→` verdadero |
| Parejas | `1`–`5` conceptos · `A`–`E` definiciones |
| Ordena | `Espacio` tomar/soltar · `↑` `↓` mover |
| Dos cajas | `←` caja A · `→` caja B |
| Hueco | `1`–`4` opción |
| Encuentra el error | `1`–`6` línea |
| ¿Quién soy? | `1`–`4` opción (niveles 1–2) · escribir + `Enter` (nivel 3) |
| El intruso | `1`–`4` ficha |
| ¿Cuál es mayor? | `←` izquierda · `→` derecha |
| Explícalo en una frase | Escribir · `Ctrl/⌘+Enter` enviar |

Reglas: cada ficha con atajo muestra su `Kbd`; bajo el área de juego hay una leyenda de una línea con los atajos del juego actual; en tablet y móvil los atajos y la leyenda se ocultan.

---

## 12. Especificación de cada minijuego

Tiempos y cantidades son el punto de partida para la **dificultad progresiva** (nivel 1 → 3, que corresponde a `difficulty` `"baja"`, `"media"` y `"alta"` en la plantilla, §2.2). Se ajustan con pruebas de usuarios. Prioridad de prototipo según el benchmark: **Parejas, Hueco y Ordena**, más **Desliza** como calentamiento.

| # | Juego | Interacción | Nivel 1 | Nivel 2 | Nivel 3 | Envío | Componentes clave |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Desliza** | Tarjeta: deslizar derecha = verdadero, izquierda = falso. Botones ✓ / ✗ como alternativa. | 6 cartas, 8 s c/u | 8 cartas, 6 s | 8 cartas, 4 s | auto (por carta) | `SwipeCard` (Motion drag), indicadores laterales verde/rojo |
| 2 | **Parejas** | Tocar un concepto y luego una definición; se unen con el color/forma de la categoría. | 3 pares, 45 s | 4 pares, 50 s | 5 pares, 50 s | auto al completar | `MatchColumn`, conector de color |
| 3 | **Ordena** | Arrastrar pasos a una lista numerada. Flechas ↑↓ como alternativa. | 4 pasos, 45 s | 5 pasos, 50 s | 6 pasos, 55 s | botón | `SortableList` (dnd-kit) |
| 4 | **Dos cajas** | Tarjetas caen una a una; arrastrar o tocar caja A / B. | 6 tarjetas, 6 s c/u | 8, 5 s | 10, 4 s | auto | `DropZone` ×2 con color + letra |
| 5 | **Hueco** | Oración con un espacio; tocar una de 3 fichas (o arrastrar). | 3 opciones, 20 s | 3 opciones, 15 s | 4 opciones, 12 s | auto al elegir | `BlankSentence`, `GameTile` |
| 6 | **Encuentra el error** | Solución de 5 líneas; tocar la incorrecta. | 4 líneas, 40 s | 5 líneas, 35 s | 6 líneas, 30 s | auto | `CodeLine` (fuente mono, numeradas) |
| 7 | **¿Quién soy?** | Pistas se revelan cada X s de vaga a clara; escribir o elegir respuesta. | 4 opciones, pista cada 8 s | 4 opciones, cada 6 s | texto libre, cada 6 s | botón | `ClueReveal`, `Input` / opciones |
| 8 | **El intruso** | 4 fichas en grid 2×2; tocar la que no pertenece. | 4 fichas, 20 s | 4, 15 s | 4 conceptos cercanos, 12 s | auto | Grid de `GameTile` |
| 9 | **¿Cuál es mayor?** | 2 tarjetas lado a lado (apiladas en móvil); tocar la mayor / anterior / más rápida. | 5 rondas, 8 s | 6, 6 s | 8, 5 s | auto (por ronda) | `CompareCard` |
| 10 | **Explícalo en una frase** | Escribir la idea; un LLM la compara con la fuente. | 60 s, 150 caracteres | 50 s, 120 | 45 s, 100 | botón | `Textarea` con contador, estado "Evaluando…" |

**Notas por juego**

- **Desliza:** la tarjeta se inclina hasta 12° al arrastrar; superar el 35 % del ancho confirma. Mostrar "VERDADERO" / "FALSO" como etiqueta al inclinar (no solo color).
- **Parejas:** en desktop, dos columnas de ≈440 px con un conector visual entre pares formados; en móvil, dos columnas de 50 % cada una y, si las definiciones son largas, conceptos arriba en chips horizontales y definiciones abajo en lista.
- **Desliza:** en desktop, además de arrastrar con el mouse, se responde con `←` / `→`; los botones ✗ / ✓ quedan visibles a los lados de la tarjeta.
- **Ordena:** la lista muestra números fijos (1, 2, 3…) y las tarjetas se colocan en ellos. Teclado: espacio para tomar, flechas para mover, espacio para soltar (dnd-kit `KeyboardSensor`).
- **Encuentra el error:** si el curso no es de programación, las líneas se muestran en `body-lg` (no mono).
- **¿Quién soy?:** la tabla original propone más puntos si se adivina antes; ver decisión pendiente en §20.
- **Explícalo en una frase:** la evaluación del LLM tarda; el temporizador se detiene al enviar y se muestra un estado de carga con `Skeleton` en el `FeedbackSheet`. El LLM evalúa **después** del intento: coherente con "la IA explica después, nunca durante".

---

## 13. Feedback, puntaje y reglas

Reglas definidas en el documento de contexto; el frontend las **muestra**, el backend las **calcula**.

| Regla | Valor | UI |
| --- | --- | --- |
| Acierto | +10 puntos | `FeedbackSheet` éxito + "+10 ✨" animado |
| Acierto con pista | +5 puntos | Botón de pista muestra "(−5 pts)" antes de usarla |
| Error | 0 puntos, nunca se restan | `FeedbackSheet` con explicación del error (usa `confusiones` del átomo) |
| Tiempo agotado | Igual que error | Título "Se acabó el tiempo" + explicación |
| Límite semanal | 10 retos | `WeeklyQuota`; al llegar a 10, el botón "Jugar" se desactiva con el texto "Vuelve el lunes" y la fecha |
| Cambio de pestaña | **Versión futura** | Ver abajo |

**Estructura del `FeedbackSheet`**

1. Ícono + título: "¡Correcto!" / "Casi" / "Se acabó el tiempo".
2. Puntos obtenidos (o "0 pts" en `text-muted`, sin rojo).
3. **Explicación** (máximo 2–3 oraciones): por qué la respuesta correcta es correcta y, si falló, por qué su elección no lo es.
4. Referencia a la fuente: "Semana 5 · Tema.pdf, p. 12" (refuerza que el contenido viene del curso).
5. Botón "Continuar".

**Detección de cambio de pestaña (preparado, desactivado en v1).** Crear desde ya el hook `useVisibilityGuard()` que escucha `visibilitychange` y `blur`, detrás del feature flag `ENABLE_TAB_GUARD=false`. En v1 solo registra el evento para analítica; cuando se active, muestra un aviso ("Saliste de la pestaña: este reto pasará al siguiente") y salta el reto.

**Pantalla de resultado del reto**

- `StarRating` (3 estrellas: correcto rápido; 2: correcto; 1: correcto con pista; 0: incorrecto — ajustable).
- Puntos ganados, tiempo usado, racha actual, retos restantes esta semana.
- Botones: "Siguiente reto" (primario) y "Ver ranking" (secundario).

---

## 14. Accesibilidad

Objetivo: **WCAG 2.2 nivel AA**.

| Tema | Regla |
| --- | --- |
| Contraste | Texto normal ≥ 4.5:1, texto grande y componentes ≥ 3:1. Los tokens de §4 ya cumplen sobre `bg` y `surface`; validar al crear combinaciones nuevas. |
| Objetivos de clic y táctiles | Mínimo 44 × 44 px en todos los tamaños; fichas de juego de 64 px de alto en desktop y 48 px en móvil. Separación mínima de 12 px entre fichas en desktop y 8 px en móvil. |
| Hover | Todo estado hover en desktop tiene un equivalente de foco (`focus-visible`); nada se revela solo con hover. |
| Color | Nunca como único portador de significado: categorías con forma + letra, correcto/incorrecto con ícono + texto. |
| Teclado | Todo el flujo, incluido cada juego, se completa sin mouse. Orden de foco lógico. Foco visible siempre (`glow-primary`). |
| Drag & drop | Siempre con alternativa: tocar para seleccionar + tocar destino, o flechas de teclado. |
| Lectores de pantalla | `aria-live="polite"` para feedback; el temporizador anuncia solo en umbrales (50 %, 20 %, 5 s), no cada segundo. Fichas con `role="button"` o elementos nativos. |
| Tiempo límite | WCAG pide poder ajustar los límites de tiempo. Como el tiempo es parte del diseño anti-IA, se ofrece un **ajuste de accesibilidad por estudiante habilitado por el docente** (ej. tiempo ×1.5) en lugar de desactivarlo. |
| Movimiento | Respetar `prefers-reduced-motion` (§7.3). |
| Zoom | La UI debe funcionar a 200 % de zoom sin perder contenido. |
| Idioma | `<html lang="es-PE">`. |

---

## 15. Voz y microcopy

**Tono:** un compañero de estudio que sabe del tema: cercano, directo, motivador, nunca infantil ni burlón. Tuteo. Español neutro peruano.

| Situación | Sí | No |
| --- | --- | --- |
| Acierto | "¡Correcto!", "Bien ahí", "Lo tienes" | "¡¡¡INCREÍBLE!!!" |
| Error | "Casi. Mira por qué:" | "Incorrecto", "Fallaste" |
| Tiempo agotado | "Se acabó el tiempo. Así se resolvía:" | "Muy lento" |
| Límite semanal | "Completaste tus 10 retos de la semana. Vuelve el lunes 3/11." | "No tienes más intentos" |
| Racha perdida | "Tu racha volvió a 0. Un reto hoy la reinicia." | "Perdiste tu racha" |
| Ranking bajo | "Estás a 30 puntos del puesto 12." | "Estás en los últimos lugares" |
| Carga | "Preparando tu reto…" | "Cargando…" (genérico) |

**Reglas de escritura**

- Botones con verbo: "Jugar", "Comprobar", "Continuar", "Ver ranking".
- Oraciones de máximo 15 palabras en la UI de juego.
- Números con formato local: `1 250 pts`, fechas `lun 3 nov`.
- Todos los textos en `src/content/copy.ts` (o i18n si se planea otro idioma), no escritos sueltos en componentes.

---

## 16. Estructura del proyecto y convenciones de código

### 16.1 Estructura de carpetas

```
apps/web/src/                   # Estructura del monorepo completo en §2.4
├── app/                        # Rutas (Next.js App Router) y route handlers en app/api/
│   ├── (auth)/login/
│   ├── (student)/inicio/
│   ├── (student)/cursos/[courseId]/
│   ├── (student)/reto/[sessionId]/
│   ├── (student)/perfil/
│   ├── (teacher)/docente/
│   └── layout.tsx
├── components/
│   ├── ui/                     # UI kit base (§9) — dueños: Luis y William
│   ├── gamification/           # Puntos, racha, ranking (§10)
│   ├── game/                   # GameShell, GameTimer, FeedbackSheet, GameTile (§11)
│   ├── brand/                  # <Logo /> y <CuyFrontal /> (§3.1–3.2)
│   └── layout/                 # Navegación, AppShell
├── games/                      # UN FOLDER POR JUEGO
│   ├── types.ts
│   ├── registry.ts
│   ├── emparejar/              # carpeta = type de la plantilla (juego Parejas)
│   │   ├── index.ts            # export de GameDefinition
│   │   ├── Parejas.tsx         # componente del área central
│   │   ├── schema.ts           # re-exporta payload de packages/game-templates + answer
│   │   ├── logic.ts            # lógica pura (sin React)
│   │   ├── logic.test.ts
│   │   ├── Parejas.stories.tsx
│   │   ├── fixtures.ts         # datos de ejemplo para Storybook y MSW
│   │   └── README.md           # decisiones del juego
│   └── ordenar_pasos/ ...
├── lib/
│   ├── api/                    # Cliente HTTP + tipos generados de OpenAPI
│   ├── hooks/                  # useVisibilityGuard, useCountdown, etc.
│   └── utils/
├── stores/                     # Zustand: gameSessionStore
├── content/copy.ts             # Microcopy
├── styles/tokens.css           # Tokens (§4.7)
└── mocks/                      # MSW handlers
```

### 16.2 Convenciones de nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Componentes | PascalCase, un componente por archivo | `GameTimer.tsx` |
| Hooks | `use` + camelCase | `useCountdown.ts` |
| Tipo de juego y su carpeta | snake_case = `type` de la plantilla | `completar_oraciones/` |
| Tipos e interfaces | PascalCase, sin prefijo `I` | `ChallengePayload` |
| Constantes | UPPER_SNAKE_CASE | `WEEKLY_CHALLENGE_LIMIT` |
| Variables de entorno públicas | `NEXT_PUBLIC_` | `NEXT_PUBLIC_API_URL` |
| Código | Inglés | `isComplete`, `onSubmit` |
| Texto visible | Español, en `copy.ts` | — |

> Excepción aceptada: los campos del `Atom` (`concepto`, `definicion`…) se mantienen en español porque así los define el modelo de datos del equipo. Acordarlo con backend y no mezclar en el resto.

### 16.3 Reglas de código

- TypeScript `strict: true`, prohibido `any` (salvo el registry tipado).
- Componentes funcionales; props tipadas con `interface`.
- Estilos solo con clases de Tailwind basadas en tokens. Para variantes, usar `cva` (class-variance-authority, ya incluido con shadcn).
- Lógica de validación del juego en `logic.ts`, como funciones puras testeables.
- Nada de `localStorage` para datos de juego ni tokens.
- Imágenes con `next/image`, fuentes con `next/font`.

### 16.4 Rendimiento

| Métrica | Objetivo (laptop con wifi universitario y móvil 4G) |
| --- | --- |
| LCP | < 2.5 s |
| INP | < 200 ms |
| CLS | < 0.1 |
| JS por ruta de juego | < 200 KB gzip |

Medir en ambos escenarios: el wifi de campus suele estar saturado en horas punta, así que el objetivo no se relaja por ser desktop.

Cada juego se carga con `next/dynamic` desde el registry para que la ruta del reto solo descargue el juego que toca.

### 16.5 Herramienta de ajuste fino (recomendación del mentor)

Cuando un componente no queda bien posicionado (ej. la barra lateral o la barra inferior en móvil), en lugar de pedirle a la IA "céntralo" repetidamente:

1. Envolver el componente con controles de **leva** (solo en `development`): eje X, eje Y, escala, rotación, padding, gap.
2. Ajustar visualmente en el navegador.
3. Usar el botón **"Copiar valores"** (copia un JSON al portapapeles).
4. Pegar esos valores en el código o en el prompt a la IA para que aplique exactamente esos números.

```tsx
// Solo en desarrollo
const { x, y, scale, rotate } = useControls("BottomNav", {
  x: { value: 0, min: -100, max: 100, step: 2 },
  y: { value: 0, min: -100, max: 100, step: 2 },
  scale: { value: 1, min: 0.5, max: 1.5, step: 0.02 },
  rotate: { value: 0, min: -15, max: 15, step: 1 },
  "Copiar valores": button((get) =>
    navigator.clipboard.writeText(JSON.stringify({ x: get("BottomNav.x"), y: get("BottomNav.y"), scale: get("BottomNav.scale"), rotate: get("BottomNav.rotate") }))
  ),
});
```

Al terminar, los valores se convierten en clases/tokens y se elimina `useControls`.

### 16.6 Uso de IA para generar UI

Siguiendo el pipeline del mentor: al pedirle a una IA una pantalla o un juego, **siempre** adjuntar:

1. Este archivo (o las secciones 4, 5, 9 y 11).
2. La imagen/boceto de la pantalla **en versión desktop**, y la instrucción de adaptarla a tablet y móvil según §6.
3. La instrucción: *"Usa exclusivamente los tokens y componentes definidos en el design system. No inventes colores, tamaños ni componentes nuevos. El juego debe implementar `GameDefinition` y renderizarse dentro de `GameShell`."*

---

## 17. Contrato con el backend

Los endpoints son route handlers de Next.js (`apps/web/src/app/api/`), a cargo de Sebas y Juan Diego. Lo mínimo que necesita el frontend:

| Método | Endpoint | Respuesta / propósito |
| --- | --- | --- |
| `GET` | `/api/me` | Usuario, rol, cursos |
| `GET` | `/api/courses/{courseId}` | Curso, semana actual, semanas del sílabo |
| `GET` | `/api/courses/{courseId}/progress` | Puntos, racha, `played`/`limit` semanales |
| `POST` | `/api/courses/{courseId}/challenges` | Crea un reto → `ChallengeSession` |
| `POST` | `/api/challenges/{sessionId}/hint` | Revela la pista (registra que se usó) |
| `POST` | `/api/challenges/{sessionId}/answer` | Envía la respuesta → `ChallengeResult` |
| `GET` | `/api/courses/{courseId}/leaderboard?page=` | Ranking de la sección + posición del usuario |
| `GET` | `/api/me/achievements` | Logros |
| `POST` | `/api/courses/{courseId}/materials` | Docente sube un archivo para una semana → inicia el pipeline (§2.1) |
| `GET` | `/api/materials/{materialId}` | Estado del pipeline (para `PipelineSteps`) y vista previa del `.md` |
| `GET` | `/api/materials/{materialId}/drafts` | Retos generados pendientes de revisión |
| `PATCH` | `/api/drafts/{draftId}` | Docente edita o descarta un reto |
| `POST` | `/api/drafts/{draftId}/publish` | Publica el reto para los estudiantes |

```ts
interface ChallengeSession {
  sessionId: string;
  game: GameSlug;
  difficulty: "baja" | "media" | "alta";
  week: number;
  payload: unknown;             // Validado con payloadSchema del juego. SIN respuesta correcta.
  hintAvailable: boolean;
  startedAt: string;            // ISO, hora del servidor
  deadline: string;             // ISO, hora del servidor
}

interface ChallengeResult {
  correct: boolean;
  pointsAwarded: 0 | 5 | 10;
  timedOut: boolean;
  correctAnswer: unknown;       // Para mostrar en el feedback
  explanation: string;
  source: { documento: string; pagina?: number };
  totals: { points: number; streakDays: number; weeklyPlayed: number; weeklyLimit: number };
}
```

**Formato de errores** (uniforme): `{ code: string; message: string }` con códigos como `WEEKLY_LIMIT_REACHED`, `CHALLENGE_EXPIRED`, `SESSION_NOT_FOUND`. El frontend mapea cada `code` a un mensaje de `copy.ts`.

**Reloj:** el frontend calcula el tiempo restante como `deadline − (ahora + desfase)`, donde el desfase se mide con la hora del servidor al crear la sesión. El backend rechaza respuestas fuera de `deadline` + un margen de red (ej. 1.5 s).

---

## 18. Flujo de trabajo del equipo

**Ramas y commits**

- `main` protegida: solo entra por PR con 1 aprobación y checks en verde.
- Ramas: `feat/game-parejas`, `feat/ui-button`, `fix/timer-mobile`, `docs/design-system`.
- Commits con Conventional Commits: `feat(parejas): conectores de color por par`.

**Orden de construcción sugerido**

1. Tokens, fuentes y `tokens.css` (§4–5).
2. UI kit base en Storybook (§9).
3. `GameShell`, `GameTimer`, `FeedbackSheet`, `GameTile`, `ResultScreen` + store de sesión + MSW (§11, §13).
4. **En paralelo, un integrante por juego:** Parejas, Hueco, Ordena, Desliza.
5. Gamificación (puntos, racha, ranking) y pantallas de navegación.
6. Integración con el API real.
7. Resto de juegos.

**Checklist de PR**

- [ ] Usa solo tokens (sin hex, px ni ms sueltos).
- [ ] Usa componentes del UI kit; si creó uno nuevo, está en Storybook y justificado.
- [ ] Probado primero a 1280 × 720 y 1366 × 768, y luego a 768 px y 390 px.
- [ ] Atajos de teclado funcionando y visibles en desktop (§11.5).
- [ ] Navegable con teclado y foco visible.
- [ ] Textos en `copy.ts`.
- [ ] Tests pasan; lint y tipos sin errores.
- [ ] Captura o enlace al preview del PR (§2.4) en la descripción.
- [ ] Si se tocó una plantilla JSON o su schema, se subió su `version`.

---

## 19. Definition of Done de un minijuego

Un juego está terminado cuando:

- [ ] Implementa `GameDefinition` y está registrado en `registry.ts`.
- [ ] Se renderiza dentro de `GameShell` sin estilos propios de header, timer o feedback.
- [ ] Tiene `payloadSchema` y `answerSchema` en zod, y `fixtures.ts` con datos realistas.
- [ ] Soporta los 3 niveles de dificultad de §12.
- [ ] Funciona con mouse, teclado (con los atajos de §11.5) y táctil (con alternativa al arrastre).
- [ ] Cabe sin scroll en 1280 × 720, en 1366 × 650 de área útil y en 390 × 844, en los 3 niveles.
- [ ] Todos los estados de `GameTile` (§11.4) se ven correctamente.
- [ ] Respeta `prefers-reduced-motion`.
- [ ] `logic.ts` tiene tests unitarios.
- [ ] Historias en Storybook: niveles 1–3, `disabled`, pista revelada, textos largos.
- [ ] `README.md` del juego explica la mecánica y cualquier decisión fuera del estándar.
- [ ] Tiene su plantilla en `packages/game-templates` (JSON + schema) y funciona en `mode="preview"` para la revisión del docente.
- [ ] Revisado por al menos otro integrante en el preview del PR desde una laptop y desde un celular real.

---

## 20. Decisiones pendientes

| # | Tema | Opciones | Responsable |
| --- | --- | --- | --- |
| 1 | Puntaje de **¿Quién soy?** (más puntos si adivinas antes) vs. regla general de 10 pts | a) 10 pts fijos; b) 10 base + bonus visible por pistas no usadas | Equipo |
| 2 | Cómo se elige el juego de cada reto | a) aleatorio según contenido de la semana; b) el estudiante elige entre 3 tarjetas | Equipo + mentor |
| 3 | Progresión de dificultad | a) por semana del ciclo; b) por desempeño del estudiante; c) ambas | Equipo |
| 4 | Autenticación | Supabase Auth (recomendado, ya está en el stack) vs. Auth.js | Backend |
| 5 | Tema claro en v1 | Solo panel docente vs. toda la app | Frontend |
| 6 | Ajuste de tiempo por accesibilidad | Multiplicador configurable por el docente | Equipo |
| 7 | Nombre del producto | Logotipo y paleta definidos (cuy, negro + naranja); falta el nombre que reemplaza `[NOMBRE]` | Equipo || 8 | ¿Se mantiene Spring Boot? | a) No: todo en Next.js (lo que asume este documento); b) Sí: Spring como API y Next.js solo frontend | Equipo + mentores |
| 9 | Modelos para el LLM 1 y el LLM 2 | Qwen, Gemini (Google AI Studio) u otro, elegidos con pruebas sobre PDFs reales (§2.3) | Backend |
| 10 | Deploy de la web | a) Todo en Cloud Run; b) web en Vercel y solo MarkItDown en Cloud Run | Equipo |

---

*Cualquier cambio a este documento se hace por PR con la etiqueta `design-system` y se avisa al equipo.*
