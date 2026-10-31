# Integración documental y retos

## Arranque local

Requiere Node.js 22.13 o superior y pnpm 11.25.0.

```powershell
corepack enable
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
```

Completa en `.env.local`:

```dotenv
NEXT_PUBLIC_API_MOCKING=disabled
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=CLAVE_PRIVADA_DEL_SERVIDOR
AI_GATEWAY_API_KEY=CLAVE_PRIVADA_DEL_GATEWAY
AI_GATEWAY_MODEL=alibaba/qwen3.7-flash
DATABASE_URL=CADENA_DEL_TRANSACTION_POOLER_DE_SUPABASE
BETTER_AUTH_SECRET=SECRETO_DE_32_CARACTERES_O_MAS
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=CLIENTE_DE_GOOGLE
GOOGLE_CLIENT_SECRET=SECRETO_DE_GOOGLE
```

No uses `NEXT_PUBLIC_` para las claves. `DECISION_LLM_*` sigue disponible para el adaptador HTTP de decisión del equipo; sin esa URL se utiliza LangChain con AI Gateway para decidir. El relleno de juegos utiliza AI Gateway.

En Supabase, ejecuta **una sola vez y en orden** `supabase/migrations/202610300001_learning_pipeline.sql`, `202610300002_better_auth.sql`, `202610300003_drop_legacy_tables.sql`, `202610300004_teacher_flow.sql`, `202610300005_teachers.sql` y `202610300006_course_admin.sql` en SQL Editor. Crean las tablas y las de Better Auth, sin políticas de lectura para el navegador, y eliminan las tablas de la app anterior si existen. La migración inicial también crea el bucket `course-materials`, que ya no se usa.

```powershell
pnpm dev
```

Abre [Ingresar](http://localhost:3000/ingresar). La sesión la gestiona Better Auth con una cookie HTTP-only; al vencer debes volver a ingresar.

## Dar de alta un docente

El registro público crea cuentas de alumno. Para que una cuenta pueda crear cursos, regístrala en `/ingresar` y agrégala desde SQL Editor:

```sql
insert into public.teachers(user_id)
select id from public."user" where lower(email) = 'CORREO-DEL-DOCENTE';
```

## Recorrido del docente

1. Ingresa con Google o con correo y contraseña. Llegas a `/cursos`, con tus cursos en tarjetas y una tarjeta «Crear curso». Esa tarjeta solo aparece para docentes.
2. «Crear curso» abre `/docente/nuevo`. Escribe el nombre y agrega PDFs con **+** (selector del sistema, solo PDF) o arrastrándolos a la ventana. Cada PDF entra como S1; cambia la semana en su selector y bórralo con el tacho si hace falta. Son válidos `fixtures/teoria.pdf` y `fixtures/silabo.pdf`, materiales ficticios.
3. «Subir» crea el curso (quien lo crea queda como su docente), convierte cada PDF a Markdown con MarkItDown y lo asocia a su semana. El nombre del PDF es el tema de la semana. Cada PDF puede pesar hasta 4 MB y no se guarda; el Markdown se conserva solo para generar y reintentar, y se borra al pulsar «Terminar».
4. `/docente/ID-DEL-CURSO/camino` genera una semana a la vez, para respetar el límite de llamadas por minuto de AI Gateway, y resume donde quedó si recargas:
   - Con el Markdown de la semana en el System Prompt, el modelo de decisión responde en una sola llamada un booleano por cada uno de los 10 juegos: recibe un mapa `questions` con su `id` y descripción y devuelve `answers` bajo los mismos ids (`src/lib/decision/gameDecision.ts`).
   - Los juegos marcados se envían en una sola llamada como `{ id, args: [...] }` (`src/lib/games/catalog.ts`) para que el LLM complete sus parámetros. Cada juego se valida con Zod, con sus citas del documento (se comparan solo letras y números, y al menos el 75 % del texto citado debe estar en el PDF), con la consistencia de sus opciones y con que el enunciado no revele la respuesta; los rechazados se reintentan una vez sin descartar los válidos.
   - Se guardan asociados al curso. La fecha 0 es el siguiente lunes en hora de Lima, u hoy si es lunes; cada semana abre el lunes a las 00:00 y vence al iniciar la siguiente.
5. El camino muestra todos los juegos. Al tocar uno se edita su contenido; el servidor reconstruye payload, solución y pista.
6. «Terminar» publica los juegos y abre la administración del curso (`/docente/ID-DEL-CURSO`), por ahora vacía.

## Recorrido del estudiante

Las membresías de estudiante se administran en el servidor/SQL, nunca mediante datos de rol enviados por el navegador:

```sql
insert into public.course_members(course_id, user_id, role, section) values
('ID-DEL-CURSO', 'ID-DEL-ESTUDIANTE', 'student', 'A');
```

El curso aparece en `/cursos` con la etiqueta «Estudiante» y lleva a `/cursos/ID-DEL-CURSO/practicar`. Solo se juegan los retos de la semana en curso, dentro de su ventana. La sesión recibe opciones sin solución ni cita que revele la respuesta. Acierto: 10 puntos; con pista: 5; error o tiempo agotado: 0. Cada reto tiene un solo intento y hay un máximo de 10 por semana. El tiempo, el cupo y los puntos se controlan en servidor y mediante transacciones SQL. «Explícalo en una frase» se evalúa con el LLM después del intento.

El flujo anterior con sílabo sigue disponible en `/docente/ID-DEL-CURSO/material`.

El selector original de los diez juegos permanece disponible en `/cursos/ID-DEL-CURSO/jugar`. Para la demo anterior con átomos ficticios usa `NEXT_PUBLIC_API_MOCKING=enabled` y reinicia Next; vuelve a `disabled` para el recorrido real. No mezcles MSW con sesiones reales: sus interceptores simulan los mismos endpoints.

## Pruebas reproducibles sin claves

```powershell
pnpm install --frozen-lockfile
pnpm exec next typegen
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Los PDFs ya están incluidos. Para regenerarlos: `node scripts/create-pdf-fixtures.mjs`.

- `pipeline.test.ts`: conversión real de PDFs mediante MarkItDown, rechazo de PDFs inválidos/vacíos/grandes, decisión por juego, relleno parcial con reintento, construcción y calificación de los 10 juegos, y evidencias.
- `schedule.test.ts`: fecha 0 en hora de Lima, ventanas semanales y dificultad progresiva.
- `routes.test.ts`: ejecuta los Route Handlers reales de creación de curso, carga, generación por semana, edición, cierre, sesión, pista y respuesta. Usa la migración real en PostgreSQL embebido (PGlite); simula transporte Supabase, Auth y respuesta del modelo. Comprueba autorización, aislamiento, persistencia, reenvíos, puntos, tiempo y cupo. No requiere Docker ni servicios externos.
- `model.test.ts`: ejecuta el adaptador real LangChain contra un transporte simulado y verifica URL, modelo, salida estructurada y `reasoning.effort=none`.
- `pnpm test:e2e`: prueba el recorrido del docente, las pantallas y el `GameShell` en Chromium con respuestas HTTP de prueba. Primera vez: `pnpm exec playwright install chromium`. No invoca IA ni Supabase reales.

`markitdown-js@0.0.14` incluye un lector PDF.js antiguo que falló con PDFs válidos bajo Node 22. El servicio registra un convertidor mediante su API pública `registerConverter`, con `pdf-parse@2` como lector actualizado. Toda la conversión sigue dentro de MarkItDown en Node. Los temporales tienen directorio aleatorio y se eliminan en `finally`; el contenido persistente vive en Supabase. No se ejecuta Python ni OCR. PDFs escaneados sin texto deben convertirse previamente a texto seleccionable.

Referencias consultadas: [API de MarkItDown](https://github.com/Mirza-Glitch/markitdown-js), [lector PDF](https://github.com/mehmet-kozan/pdf-parse), [LangChain](https://docs.langchain.com/oss/javascript/integrations/chat/openai), [Qwen y non-thinking](https://vercel.com/ai-gateway/models/qwen3.7-flash).

## Producción y Cloud Run

El CD de `.github/workflows/ci-cd.yml` despliega a Vercel: los PR crean una vista previa y `main` publica en producción. Vercel rechaza cuerpos de más de 4.5 MB, por eso cada PDF se limita a 4 MB. El contenedor siguiente es la alternativa para Cloud Run.

Sin Docker, para comprobar el build local:

```powershell
pnpm build
pnpm start
```

Prueba `/ingresar` y repite el mismo recorrido. Las variables públicas se fijan durante el build. No construyas producción con MSW activado.

Con el motor Docker encendido:

```powershell
docker build -t javalimos .
docker run --rm -p 8080:8080 --env-file .env.local javalimos
```

El contenedor usa salida standalone, usuario sin privilegios, puerto 8080 y temporales efímeros. En Cloud Run:

```powershell
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/javalimos
gcloud run deploy javalimos --image REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/javalimos --region REGION --port 8080 --allow-unauthenticated --timeout 300 --memory 1Gi --set-env-vars "SUPABASE_URL=https://TU-PROYECTO.supabase.co,AI_GATEWAY_MODEL=alibaba/qwen3.7-flash,BETTER_AUTH_URL=https://TU-SERVICIO.run.app,GOOGLE_CLIENT_ID=CLIENTE_DE_GOOGLE" --set-secrets "SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,AI_GATEWAY_API_KEY=AI_GATEWAY_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest,BETTER_AUTH_SECRET=BETTER_AUTH_SECRET:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest"
```

Sustituye región, proyecto y repositorio. Crea previamente los dos secretos en Secret Manager y permite que la cuenta de servicio de Cloud Run los lea. La URL es pública para servir la pantalla de ingreso; las APIs protegidas siguen exigiendo sesión y membresía. No incluyas claves en la imagen. Ejecuta la migración y el registro de usuarios antes de probar el recorrido por HTTPS.

## Alcance de verificación

La decisión y el relleno ya se comprobaron contra Qwen real por AI Gateway con material ficticio. Las llamadas reales a Supabase requieren tus credenciales. Las pruebas deterministas no equivalen a una llamada real al modelo. El build del contenedor y el despliegue requieren un motor Docker/Google Cloud disponible; no se consideran comprobados por ejecutar `pnpm build`.

No se rediseñó la mecánica de los juegos existentes; `src/styles/tokens.css` pasó a la paleta negro/naranja de `FRONTEND_DESIGN_SYSTEM.md`. `<Logo />` y `<CuyFrontal />` son SVG provisionales hasta contar con el archivo fuente del logotipo. La plantilla inicial de Next que ocultaba `src/app` se conserva íntegra en `archive/next-starter/`.

## Archivos de esta implementación

- Servicios nuevos: `src/lib/server/{errors,supabase,pdf,materials,model,generation,challenges}.ts`.
- Pantallas nuevas: `src/app/ingresar/page.tsx`, `src/app/docente/{page,nuevo,[courseId],[courseId]/camino,[courseId]/material}`, `src/app/(student)/cursos/[courseId]/practicar/page.tsx`.
- Componentes nuevos: `src/components/teacher/*`, `src/components/brand/{Logo,CuyFrontal}.tsx`, `src/components/materials/{TeacherWorkspace,PublishedChallenges}.tsx` y `Workspace.module.css`.
- APIs nuevas: `src/app/api/auth/[...all]/route.ts`; `src/app/api/courses/[courseId]/{materials,generation,challenges,progress}/route.ts`; `src/app/api/challenges/[sessionId]/route.ts` y sus rutas `hint/route.ts` y `answer/route.ts`.
- Integración existente adaptada: `src/lib/decision/provider.ts`, `src/app/api/decision/route.ts`, `src/lib/api/schemas.ts`, `src/lib/config.ts`, `src/app/page.tsx`, `src/components/game/GameShell.tsx` y `ResultScreen.tsx`. En los dos últimos solo se ajustó el destino de retorno al listado real; no se modificaron sus estilos.
- Base de datos: `supabase/migrations/202610300001_learning_pipeline.sql` a `202610300006_course_admin.sql`.
- Pruebas: `src/lib/server/{pipeline,routes,model}.test.ts`, `src/test/{database,server-only}.ts`, `e2e/integration.spec.ts`, `playwright.config.ts` y `vitest.config.mts`.
- PDFs ficticios: `fixtures/{silabo,teoria,vacio}.pdf`; generador `scripts/create-pdf-fixtures.mjs`.
- Configuración y ejecución: `package.json`, `pnpm-lock.yaml`, `.env.example`, `.gitignore`, `next.config.ts`, `tsconfig.json`, `Dockerfile` y `.dockerignore`.
- Documentación: `README.md` y este archivo. La plantilla original se movió de `app/` a `archive/next-starter/`, conservando los cuatro archivos sin alteraciones.

`AGENTS.md` ya estaba modificado y `FRONTEND_DESIGN_SYSTEM.md` ya estaba sin seguimiento al comenzar; ambos se leyeron sin editarlos. No se hicieron commits ni push.
