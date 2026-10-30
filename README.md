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
