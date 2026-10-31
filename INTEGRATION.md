# Integración documental y retos

## Arranque local

Requiere Node.js 22.13 o superior y pnpm 11.25.0. Este repositorio ya usaba pnpm; el `package-lock.json` heredado se conserva, pero no se utiliza ni se actualiza.

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
```

No uses `NEXT_PUBLIC_` para las claves. `DECISION_LLM_*` sigue disponible para el adaptador HTTP de decisión del equipo; sin esa URL se utiliza LangChain con AI Gateway para decidir. El relleno de juegos utiliza AI Gateway.

En Supabase, ejecuta **una sola vez** `supabase/migrations/202610300001_learning_pipeline.sql` en SQL Editor. Crea las tablas y un bucket privado, sin políticas de lectura para el navegador. No había esquema Supabase previo en esta rama.

Crea dos usuarios con correo confirmado en Authentication → Users: uno docente y otro estudiante. Copia sus UUID y registra el curso y sus membresías desde SQL Editor:

```sql
insert into public.courses(id, name, current_week)
values ('bio-101', 'Biología · Ciclo de prueba', 1);

-- Sustituye los dos UUID por los de Authentication → Users.
insert into public.course_members(course_id, user_id, role, section) values
('bio-101', 'UUID-DEL-DOCENTE', 'teacher', 'A'),
('bio-101', 'UUID-DEL-ESTUDIANTE', 'student', 'A');
```

Las membresías se administran en el servidor/SQL, nunca mediante datos de rol enviados por el navegador. Un curso representa un ciclo. La semana activa es explícita (`courses.current_week`), no se deduce del calendario. Para cambiarla, actualiza ese campo en SQL Editor después de confirmar las semanas del sílabo.

```powershell
pnpm dev
```

Abre [Ingresar](http://localhost:3000/ingresar). La sesión usa una cookie HTTP-only y vence según la duración del token configurada en Supabase; al vencer debes volver a ingresar. El enlace «Cambiar sesión» permite ingresar con la otra cuenta; el endpoint `POST /api/auth/logout` elimina la cookie.

## Recorrido en la aplicación

1. Ingresa como docente y elige `bio-101` → «Gestionar material como docente» (`/docente/bio-101`).
2. Carga `fixtures/silabo.pdf` como sílabo y `fixtures/teoria.pdf` como teoría, uno por solicitud. Puedes cargar varios PDFs teóricos sucesivamente. Son materiales ficticios no sensibles.
3. Expande el documento para revisar el texto. Confirma las semanas sugeridas: semana 1, «Celulas y organelos»; semana 2, «Fotosintesis». Corrige las sugerencias si el PDF tiene tablas o un formato que el extractor no reconoce. Puedes añadir semanas manualmente. Las fechas son opcionales.
4. Asigna `teoria.pdf` a la semana 1 y guarda. Desmarcar una semana retira su asignación. La extracción no confirma por sí sola la correspondencia académica.
5. Pulsa «Generar un reto» para la semana 1. Se ejecuta el módulo de decisión existente, seguido de LangChain para rellenar una plantilla compatible. La respuesta se valida con Zod, se comprueban duplicados y una cita textual del documento. Si el relleno no es válido se reintenta una vez.
6. Expande «Revisar datos, solución y fuente». Esa información requiere permiso docente. Revisa la pertinencia y que la solución sea inequívoca; luego pulsa «Confirmar y publicar», o descarta el reto. La validación automática no demuestra la exactitud semántica del modelo.
7. Ingresa como estudiante → «Practicar retos publicados» (`/cursos/bio-101/practicar`). Juega el reto publicado usando el `GameShell` y el componente existente. La sesión recibe opciones sin solución ni cita que revele la respuesta. La solución y explicación llegan después de responder.
8. Prueba la pista y una respuesta correcta: 5 puntos. Sin pista: 10. Error o tiempo agotado: 0. Cada reto publicado tiene un solo intento por persona; abandonar también consume el cupo. Genera y publica retos adicionales para probar el límite de 10 sesiones de la semana. El tiempo, el cupo y los puntos se controlan en servidor y mediante transacciones SQL.

El selector original de los diez juegos permanece disponible en `/cursos/bio-101/jugar`. Para la demo anterior con átomos ficticios usa `NEXT_PUBLIC_API_MOCKING=enabled` y reinicia Next; vuelve a `disabled` para el recorrido real. No mezcles MSW con sesiones reales: sus interceptores simulan los mismos endpoints.

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

- `pipeline.test.ts`: conversión real de PDFs mediante MarkItDown, semanas, rechazo de PDFs inválidos/vacíos/grandes, juegos y evidencias.
- `routes.test.ts`: ejecuta los Route Handlers reales de carga, confirmación, asignación, generación, publicación, sesión, pista y respuesta. Usa la migración real en PostgreSQL embebido (PGlite); simula transporte Supabase, Auth, Storage y respuesta del modelo. Comprueba autorización, aislamiento, persistencia, reenvíos, puntos, tiempo y cupo. No requiere Docker ni servicios externos.
- `model.test.ts`: ejecuta el adaptador real LangChain contra un transporte simulado y verifica URL, modelo, salida estructurada y `reasoning.effort=none`.
- `pnpm test:e2e`: prueba las pantallas y el `GameShell` en Chromium con respuestas HTTP de prueba. Primera vez: `pnpm exec playwright install chromium`. No invoca IA ni Supabase reales.

`markitdown-js@0.0.14` incluye un lector PDF.js antiguo que falló con PDFs válidos bajo Node 22. El servicio registra un convertidor mediante su API pública `registerConverter`, con `pdf-parse@2` como lector actualizado. Toda la conversión sigue dentro de MarkItDown en Node. Los temporales tienen directorio aleatorio y se eliminan en `finally`; el contenido persistente vive en Supabase. No se ejecuta Python ni OCR. PDFs escaneados sin texto deben convertirse previamente a texto seleccionable.

Referencias consultadas: [API de MarkItDown](https://github.com/Mirza-Glitch/markitdown-js), [lector PDF](https://github.com/mehmet-kozan/pdf-parse), [LangChain](https://docs.langchain.com/oss/javascript/integrations/chat/openai), [Qwen y non-thinking](https://vercel.com/ai-gateway/models/qwen3.7-flash).

## Producción y Cloud Run

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
gcloud run deploy javalimos --image REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/javalimos --region REGION --port 8080 --allow-unauthenticated --timeout 300 --memory 1Gi --set-env-vars "SUPABASE_URL=https://TU-PROYECTO.supabase.co,AI_GATEWAY_MODEL=alibaba/qwen3.7-flash" --set-secrets "SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,AI_GATEWAY_API_KEY=AI_GATEWAY_API_KEY:latest"
```

Sustituye región, proyecto y repositorio. Crea previamente los dos secretos en Secret Manager y permite que la cuenta de servicio de Cloud Run los lea. La URL es pública para servir la pantalla de ingreso; las APIs protegidas siguen exigiendo sesión y membresía. No incluyas claves en la imagen. Ejecuta la migración y el registro de usuarios antes de probar el recorrido por HTTPS.

## Alcance de verificación

Las llamadas reales a Supabase, Storage y Qwen requieren tus credenciales. Las pruebas deterministas no equivalen a una llamada real al modelo. El build del contenedor y el despliegue requieren un motor Docker/Google Cloud disponible; no se consideran comprobados por ejecutar `pnpm build`.

No se rediseñaron los juegos existentes. Las interfaces nuevas usan estilos negro/naranja limitados a su propio contenedor. La plantilla inicial de Next que ocultaba `src/app` se conserva íntegra en `archive/next-starter/`.

## Archivos de esta implementación

- Servicios nuevos: `src/lib/server/{errors,supabase,pdf,materials,model,generation,challenges}.ts`.
- Pantallas nuevas: `src/app/ingresar/page.tsx`, `src/app/docente/[courseId]/page.tsx`, `src/app/(student)/cursos/[courseId]/practicar/page.tsx`.
- Componentes nuevos: `src/components/materials/{TeacherWorkspace,PublishedChallenges}.tsx` y `Workspace.module.css`.
- APIs nuevas: `src/app/api/auth/{login,logout}/route.ts`; `src/app/api/courses/[courseId]/{materials,generation,challenges,progress}/route.ts`; `src/app/api/challenges/[sessionId]/route.ts` y sus rutas `hint/route.ts` y `answer/route.ts`.
- Integración existente adaptada: `src/lib/decision/provider.ts`, `src/app/api/decision/route.ts`, `src/lib/api/schemas.ts`, `src/lib/config.ts`, `src/app/page.tsx`, `src/components/game/GameShell.tsx` y `ResultScreen.tsx`. En los dos últimos solo se ajustó el destino de retorno al listado real; no se modificaron sus estilos.
- Base de datos: `supabase/migrations/202610300001_learning_pipeline.sql`.
- Pruebas: `src/lib/server/{pipeline,routes,model}.test.ts`, `src/test/{database,server-only}.ts`, `e2e/integration.spec.ts`, `playwright.config.ts` y `vitest.config.mts`.
- PDFs ficticios: `fixtures/{silabo,teoria,vacio}.pdf`; generador `scripts/create-pdf-fixtures.mjs`.
- Configuración y ejecución: `package.json`, `pnpm-lock.yaml`, `.env.example`, `.gitignore`, `next.config.ts`, `tsconfig.json`, `Dockerfile` y `.dockerignore`.
- Documentación: `README.md` y este archivo. La plantilla original se movió de `app/` a `archive/next-starter/`, conservando los cuatro archivos sin alteraciones.

`AGENTS.md` ya estaba modificado y `FRONTEND_DESIGN_SYSTEM.md` ya estaba sin seguimiento al comenzar; ambos se leyeron sin editarlos. No se hicieron commits ni push.
