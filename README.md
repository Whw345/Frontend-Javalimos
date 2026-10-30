# Frontend-Javalimos

Frontend del sistema de aprendizaje para hackatón de DSC: minijuegos semanales generados desde los PDFs del curso, con leaderboard por sección y práctica sin IA.

Sigue `FRONTEND_DESIGN_SYSTEM.md` (tokens, `GameShell`, contrato de minijuegos). Este repo es **solo frontend**: mientras no exista el backend de Spring, la API se simula en el navegador con MSW (`src/mocks/`), que arma los retos desde átomos de ejemplo y califica del lado "servidor" (el cliente nunca recibe la solución antes de responder).

## Empezar

```bash
corepack pnpm install
corepack pnpm dev
```

Abre http://localhost:3000 → selector de retos del curso de demo.

| Script           | Qué hace                                            |
| ---------------- | --------------------------------------------------- |
| `pnpm dev`       | Servidor de desarrollo                              |
| `pnpm build`     | Build de producción                                 |
| `pnpm typecheck` | TypeScript (`strict`)                               |
| `pnpm lint`      | ESLint                                              |
| `pnpm test`      | Tests unitarios (Vitest) de la lógica de cada juego |

Variables en `.env.example` (los mocks están activos salvo `NEXT_PUBLIC_API_MOCKING=disabled`).

## Módulo de decisión de minijuegos

El módulo de decisión recibe un tema que ya fue identificado y un Markdown que ya fue preparado por el módulo de entrada. No procesa PDFs, no extrae temas y no convierte archivos a Markdown.

El flujo es:

```text
Tema + Markdown preparado
        ↓
Prompt de clasificación
        ↓
LLM de decisión
        ↓
Validación con Zod
        ↓
Tres minijuegos recomendados para ese tema
```

La implementación se encuentra en `src/lib/decision/` y el endpoint es:

```text
POST /api/decision
```

### Entrada esperada

El módulo que prepara la entrada debe enviar un objeto JSON por tema. Debe existir una llamada independiente por cada tema:

```json
{
  "topicId": "bio-101-week-03",
  "topicName": "Fase luminosa",
  "markdown": "## Fase luminosa\nLa fase luminosa produce ATP y NADPH..."
}
```

Reglas de entrada:

- `topicId` identifica de manera estable el tema.
- `topicName` es el nombre legible del tema.
- `markdown` contiene únicamente el contenido académico preparado.
- El Markdown debe estar delimitado por el módulo de entrada; no debe incluir instrucciones para cambiar el comportamiento del LLM.
- El Markdown debe corresponder solamente al tema indicado en `topicName`.

### Salida del módulo

El LLM debe devolver exactamente tres recomendaciones distintas, ordenadas de mayor a menor pertinencia:

```json
{
  "schemaVersion": "1.0",
  "topicId": "bio-101-week-03",
  "recommendations": [
    {
      "rank": 1,
      "template": "matching",
      "difficulty": 1,
      "score": 0.94,
      "confidenceLevel": "high",
      "reason": "El contenido presenta conceptos y definiciones relacionadas."
    },
    {
      "rank": 2,
      "template": "multiple_choice",
      "difficulty": 2,
      "score": 0.87,
      "confidenceLevel": "high",
      "reason": "Permite evaluar relaciones causa-efecto."
    },
    {
      "rank": 3,
      "template": "fill_blank",
      "difficulty": 1,
      "score": 0.79,
      "confidenceLevel": "medium",
      "reason": "Incluye términos y datos explícitos."
    }
  ]
}
```

### Valores permitidos

`template` es una variable nominal y siempre debe enviarse como texto, nunca como un número:

| Valor | Cuándo usarlo |
| --- | --- |
| `multiple_choice` | Comprensión, relaciones causa-efecto o aplicación breve |
| `matching` | Conceptos, definiciones, categorías, autores o ejemplos |
| `ordering` | Procesos, procedimientos, algoritmos o etapas |
| `fill_blank` | Fórmulas, términos, valores o definiciones con un elemento faltante |

`difficulty` es ordinal:

| Valor | Nivel | Criterio |
| --- | --- | --- |
| `1` | Bajo | Recordar o reconocer una idea explícita |
| `2` | Medio | Comprender una relación, comparar o aplicar una regla simple |
| `3` | Alto | Aplicar o analizar varias relaciones, pasos o condiciones |

`score` es un valor entre `0` y `1` utilizado para ordenar las recomendaciones. No debe interpretarse como una probabilidad estadística calibrada.

`confidenceLevel` solo acepta `low`, `medium` o `high`.

### Reglas de validación

- Deben existir exactamente tres elementos en `recommendations`.
- Los valores de `rank` deben ser `1`, `2` y `3`.
- No se puede repetir `template`.
- `score` debe estar entre `0` y `1`.
- `difficulty` debe estar entre `1` y `3`.
- `reason` debe explicar brevemente por qué el juego se adapta al contenido.
- Los puntos, el tiempo y la generación de preguntas no pertenecen a este módulo; se calculan o ejecutan posteriormente.

### Implementación

- `src/lib/decision/schema.ts`: contrato y validación Zod.
- `src/lib/decision/templates.ts`: catálogo de plantillas.
- `src/lib/decision/prompt.ts`: reglas del prompt de clasificación.
- `src/lib/decision/decide.ts`: decisión por tema.
- `src/lib/decision/provider.ts`: adaptador HTTP genérico del proveedor LLM.
- `src/app/api/decision/route.ts`: endpoint server-side.

La API key del proveedor debe permanecer en variables de entorno del servidor (`DECISION_LLM_API_KEY`) y nunca debe enviarse desde el navegador ni versionarse en Git.

### Flujo técnico del LLM genérico

El módulo no depende directamente de un SDK de Claude, Gemini, OpenAI u otro proveedor. La aplicación utiliza la interfaz interna `DecisionModel` y un adaptador HTTP genérico:

```text
Cliente o módulo de entrada
        │ POST /api/decision
        ▼
src/app/api/decision/route.ts
        │ valida la solicitud y obtiene el modelo configurado
        ▼
src/lib/decision/decide.ts
        │ construye el prompt para el tema
        ▼
src/lib/decision/prompt.ts
        │ envía el prompt mediante DecisionModel
        ▼
src/lib/decision/provider.ts
        │ POST al endpoint del proveedor configurado
        ▼
Proveedor LLM o gateway propio
        │ devuelve tres recomendaciones en JSON
        ▼
Validación con decisionOutputSchema
        │
        ▼
Respuesta JSON final de /api/decision
```

El adaptador genérico envía al proveedor:

```json
{
  "model": "nombre-del-modelo",
  "prompt": "Prompt construido para el tema...",
  "responseFormat": "json",
  "schemaVersion": "1.0"
}
```

El proveedor debe devolver directamente `{ "recommendations": [...] }` o envolver ese objeto en una propiedad `decision`:

```json
{
  "recommendations": [
    {
      "rank": 1,
      "template": "matching",
      "difficulty": 1,
      "score": 0.94,
      "confidenceLevel": "high",
      "reason": "El contenido presenta conceptos relacionados."
    },
    {
      "rank": 2,
      "template": "multiple_choice",
      "difficulty": 2,
      "score": 0.87,
      "confidenceLevel": "high",
      "reason": "Permite evaluar relaciones causa-efecto."
    },
    {
      "rank": 3,
      "template": "fill_blank",
      "difficulty": 1,
      "score": 0.79,
      "confidenceLevel": "medium",
      "reason": "Incluye términos y datos explícitos."
    }
  ]
}
```

En la implementación actual, el servicio valida la respuesta del proveedor antes de devolverla. Si el modelo devuelve una plantilla inválida, menos de tres recomendaciones, rangos repetidos o un JSON que no cumple el contrato, la respuesta se rechaza y no llega al frontend como una decisión válida.

### Configuración del proveedor

La configuración se realiza únicamente en `.env.local`, que no debe versionarse:

```env
DECISION_LLM_URL=https://tu-gateway-llm.example.com/decide
DECISION_LLM_API_KEY=clave-secreta
DECISION_LLM_MODEL=nombre-del-modelo
```

`DECISION_LLM_URL` puede apuntar a un gateway propio que traduzca este contrato a Claude, Gemini, OpenAI u otro servicio. De esta manera, cambiar de proveedor no requiere modificar la lógica de clasificación, el schema ni el endpoint de la aplicación.

La API key se utiliza solamente desde `src/lib/decision/provider.ts`. Nunca debe incluirse en variables `NEXT_PUBLIC_*`, código del navegador, Markdown, commits ni respuestas HTTP.

### Responsabilidades técnicas

| Componente | Responsabilidad |
| --- | --- |
| Módulo de entrada | Entregar un tema con `topicId`, `topicName` y Markdown preparado |
| `route.ts` | Recibir la solicitud y devolver errores HTTP |
| `decide.ts` | Coordinar prompt, proveedor y validación |
| `prompt.ts` | Definir las reglas de clasificación |
| `provider.ts` | Comunicar la aplicación con el proveedor LLM |
| `schema.ts` | Validar entrada y salida con Zod |
| Proveedor LLM | Clasificar el tema y devolver las tres recomendaciones |
| Frontend | Consumir las recomendaciones y mostrar los minijuegos |

## Juegos implementados

Los 10 de la tabla de plantillas, cada uno con su `README.md`:

| #   | Juego                  | Carpeta                     |
| --- | ---------------------- | --------------------------- |
| 1   | Desliza                | `src/games/desliza`         |
| 2   | Parejas                | `src/games/parejas`         |
| 3   | Ordena                 | `src/games/ordena`          |
| 4   | Dos cajas              | `src/games/dos-cajas`       |
| 5   | Hueco                  | `src/games/hueco`           |
| 6   | Encuentra el error     | `src/games/encuentra-error` |
| 7   | ¿Quién soy?            | `src/games/quien-soy`       |
| 8   | El intruso             | `src/games/intruso`         |
| 9   | ¿Cuál es mayor?        | `src/games/cual-mayor`      |
| 10  | Explícalo en una frase | `src/games/explicalo`       |

Para cambiar o agregar un juego: crea `src/games/<slug>/` con `index.ts` (`GameDefinition`), componente, `schema.ts`, `logic.ts` + tests, `fixtures.ts` y `README.md`; regístralo en `src/games/registry.ts` y agrega su generador en `src/mocks/db.ts`.

## Estructura

```
src/
├── app/                 rutas (selector, reto, resultado)
├── components/ui/       UI kit base
├── components/game/     GameShell, GameTimer, FeedbackSheet, GameTile…
├── components/gamification/
├── games/               un folder por juego + registry
├── lib/api/             cliente, esquemas zod del contrato, hooks de TanStack Query
├── lib/hooks/           useCountdown, useGameHotkeys, useVisibilityGuard
├── stores/              store de sesión (Zustand, uno por reto)
├── content/copy.ts      microcopy
├── styles/tokens.css    design tokens (Tailwind v4)
└── mocks/               backend simulado (MSW)
```
