import { test, expect, type Page } from "@playwright/test";

const courseId = "44444444-4444-4444-8444-444444444444";
const gameId = "66666666-6666-4666-8666-666666666666";

/** Backend simulado del flujo docente: cada PDF abre su semana y generarla crea juegos. */
function mockTeacherApi(page: Page) {
  const state = {
    name: "",
    finished: false,
    uploads: [] as { week: string }[],
    generated: [] as number[],
    saved: null as Record<string, unknown> | null,
  };
  const game = (id: string, slug: string) => ({ id, game: slug, difficulty: 1, status: "draft" });
  const weeks = () =>
    [...new Set(state.uploads.map((upload) => Number(upload.week)))].sort().map((weekNumber) => ({
      weekNumber,
      topic: weekNumber === 1 ? "Celulas" : "Fotosintesis",
      generationStatus: state.generated.includes(weekNumber) ? "done" : "pending",
      generationError: null,
      deadline: weekNumber === 1 ? "2026-11-09T05:00:00.000Z" : "2026-11-16T05:00:00.000Z",
      games: !state.generated.includes(weekNumber)
        ? []
        : weekNumber === 1
          ? [game(gameId, "hueco"), game("g2", "parejas"), game("g3", "desliza")]
          : [game("g4", "ordena"), game("g5", "intruso"), game("g6", "quien-soy"), game("g7", "explicalo")],
    }));
  const content = {
    before: "La ",
    answer: "mitocondria",
    after: " produce ATP.",
    distractors: ["membrana", "pared celular"],
    explanation: "La mitocondria produce ATP.",
    sourceId: "doc",
    evidence: "La mitocondria produce ATP mediante la respiracion celular.",
  };
  return Promise.all([
    page.route("**/api/auth/sign-in/email", (route) => route.fulfill({ json: { token: "fixture" } })),
    page.route("**/api/auth/sign-out", (route) => route.fulfill({ json: { success: true } })),
    page.route("**/api/courses", (route) => {
      if (route.request().method() === "POST") {
        state.name = route.request().postDataJSON().name;
        return route.fulfill({ json: { id: courseId } });
      }
      return route.fulfill({
        json: {
          canCreateCourses: true,
          courses: state.name
            ? [
                {
                  id: courseId,
                  name: state.name,
                  role: "teacher",
                  setupCompleted: state.finished,
                  weeks: 2,
                  games: 7,
                },
              ]
            : [],
        },
      });
    }),
    page.route(`**/api/courses/${courseId}`, (route) =>
      route.fulfill({
        json: {
          course: { id: courseId, name: state.name, setupCompleted: state.finished },
          weeks: weeks(),
        },
      }),
    ),
    page.route(`**/api/courses/${courseId}/materials`, async (route) => {
      expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
      const body = route.request().postDataBuffer()!.toString("latin1");
      state.uploads.push({ week: body.match(/name="week"\r\n\r\n(\d+)/)![1]! });
      return route.fulfill({ json: { id: `doc-${state.uploads.length}` } });
    }),
    page.route(`**/api/courses/${courseId}/generation`, async (route) => {
      const { weekNumber } = route.request().postDataJSON();
      state.generated.push(weekNumber);
      return route.fulfill({ json: { weekNumber, games: 3 } });
    }),
    page.route(`**/api/courses/${courseId}/games/${gameId}`, (route) => {
      if (route.request().method() === "PATCH") {
        state.saved = route.request().postDataJSON().content;
        return route.fulfill({ json: { id: gameId } });
      }
      return route.fulfill({
        json: {
          id: gameId,
          game: "hueco",
          difficulty: 1,
          status: "draft",
          weekNumber: 1,
          content,
          source: { documento: "teoria.pdf" },
          evidence: content.evidence,
        },
      });
    }),
    page.route(`**/api/courses/${courseId}/finish`, (route) => {
      state.finished = true;
      return route.fulfill({ json: { published: 7 } });
    }),
  ]).then(() => state);
}

async function dropFiles(page: Page, names: string[]) {
  await page.evaluate((files) => {
    const transfer = new DataTransfer();
    for (const [index, name] of files.entries())
      transfer.items.add(
        new File([`%PDF-${index}`], name, { type: name.endsWith(".pdf") ? "application/pdf" : "text/plain" }),
      );
    window.dispatchEvent(new DragEvent("dragenter", { dataTransfer: transfer, cancelable: true }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, cancelable: true }));
  }, names);
}

test("a teacher signs in, creates a course from PDFs, edits the path and finishes", async ({ page }) => {
  const state = await mockTeacherApi(page);
  await page.goto("/ingresar");
  await expect(page.getByRole("button", { name: "Continuar con Google" })).toBeVisible();
  await page.screenshot({ path: "test-results/ingresar.png" });
  await page.getByLabel("Correo institucional").fill("docente@example.test");
  await page.getByLabel("Contraseña").fill("fixture-password");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page).toHaveURL(/\/cursos$/);
  await expect(page.getByRole("heading", { name: "Mis cursos" })).toBeVisible();
  await page.screenshot({ path: "test-results/cursos-vacio.png" });
  await page.getByRole("link", { name: /Crear curso/ }).click();

  await expect(page.getByRole("heading", { name: "Cargar" })).toBeVisible();
  const add = page.getByRole("button", { name: "Agregar PDFs" });
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), add.click()]);
  expect(chooser.isMultiple()).toBe(true);
  await chooser.setFiles(["fixtures/teoria.pdf", "fixtures/silabo.pdf"]);
  await dropFiles(page, ["arrastrado.pdf", "notas.txt"]);
  await expect(page.getByRole("status")).toContainText("Solo puedes agregar archivos PDF");
  await page.evaluate(() => {
    const transfer = new DataTransfer();
    const bytes = new Uint8Array(4 * 1024 * 1024 + 1);
    transfer.items.add(new File([bytes], "grande.pdf", { type: "application/pdf" }));
    window.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, cancelable: true }));
  });
  await expect(page.getByRole("status")).toContainText("grande.pdf pesa más de 4 MB");
  await expect(page.getByLabel(/^Semana de /)).toHaveCount(3);
  await expect(page.getByLabel("Semana de arrastrado.pdf")).toHaveValue("1");

  await page.getByRole("button", { name: "Quitar silabo.pdf" }).click();
  await expect(page.getByLabel(/^Semana de /)).toHaveCount(2);
  await page.getByLabel("Semana de arrastrado.pdf").selectOption("2");
  const submit = page.getByRole("button", { name: "Subir", exact: true });
  await expect(submit).toBeDisabled();
  await page.getByLabel("Nombre del curso").fill("Biología · Ciclo 2026-2");
  await page.screenshot({ path: "test-results/carga.png" });
  await submit.click();

  await expect(page).toHaveURL(/\/camino$/);
  await expect(page.getByRole("button", { name: "Editar Hueco, semana 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Editar Ordena, semana 2" })).toBeVisible();
  expect(state.uploads.map((upload) => upload.week)).toEqual(["1", "2"]);
  expect(state.generated.sort()).toEqual([1, 2]);
  await expect(page.getByText("Vence lun 9 nov, 00:00")).toBeVisible();
  await page.screenshot({ path: "test-results/camino.png", fullPage: true });

  await page.getByRole("button", { name: "Editar Hueco, semana 1" }).click();
  const answer = page.getByLabel("Respuesta correcta");
  await expect(answer).toHaveValue("mitocondria");
  await page.screenshot({ path: "test-results/editor.png" });
  await answer.fill("mitocondrias");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(state.saved).toMatchObject({ answer: "mitocondrias" });

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Terminar" }).click();
  await expect(page).toHaveURL(new RegExp(`/docente/${courseId}$`));
  await expect(page.getByText("Administración del curso")).toBeVisible();
  await expect(page.getByRole("tab", { name: "Ranking" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("link", { name: "Volver a mis cursos" }).last().click();
  await expect(page.getByRole("link", { name: /Biología/ })).toBeVisible();
  await page.screenshot({ path: "test-results/cursos.png" });
});

test("a teacher opens a course in three tabs: ranking, students and games", async ({ page }) => {
  const students = [{ email: "ana@example.test", name: "Ana Díaz", pending: false }];
  const entry = (rank: number, name: string, points: number) => ({
    userId: name,
    name,
    points,
    played: points / 10,
    rank,
  });
  let saved: Record<string, unknown> | null = null;
  await page.route("**/api/courses", (route) =>
    route.fulfill({
      json: {
        canCreateCourses: true,
        courses: [
          { id: courseId, name: "Biología", role: "teacher", setupCompleted: true, weeks: 1, games: 1 },
          { id: "in-setup", name: "Química", role: "teacher", setupCompleted: false, weeks: 1, games: 1 },
        ],
      },
    }),
  );
  const pathOf = (id: string, name: string, setupCompleted: boolean) => ({
    course: { id, name, setupCompleted },
    weeks: [
      {
        weekNumber: 1,
        topic: "Células",
        generationStatus: "done",
        generationError: null,
        deadline: null,
        games: [{ id: gameId, game: "hueco", difficulty: 1, status: setupCompleted ? "published" : "draft" }],
      },
    ],
  });
  await page.route(`**/api/courses/${courseId}`, (route) =>
    route.fulfill({ json: pathOf(courseId, "Biología", true) }),
  );
  await page.route("**/api/courses/in-setup", (route) =>
    route.fulfill({ json: pathOf("in-setup", "Química", false) }),
  );
  await page.route(`**/api/courses/${courseId}/leaderboard`, (route) =>
    route.fulfill({
      json: {
        leaderboard: [
          entry(1, "Ana Díaz", 120),
          entry(2, "Luis Rojas", 90),
          entry(3, "Mía Soto", 60),
          entry(4, "Omar Ruiz", 0),
        ],
      },
    }),
  );
  await page.route(`**/api/courses/${courseId}/students`, (route) => {
    const method = route.request().method();
    if (method === "POST") {
      const { emails } = route.request().postDataJSON() as { emails: string[] };
      students.push(...emails.map((email) => ({ email, name: "", pending: true })));
      return route.fulfill({ json: { enrolled: 0, invited: emails.length } });
    }
    if (method === "DELETE") {
      const { email } = route.request().postDataJSON() as { email: string };
      students.splice(
        students.findIndex((student) => student.email === email),
        1,
      );
      return route.fulfill({ json: { email } });
    }
    return route.fulfill({
      json: { students: students.map((student) => ({ ...student, name: student.name || null })) },
    });
  });
  await page.route(`**/api/courses/${courseId}/games/${gameId}`, (route) => {
    if (route.request().method() === "PATCH") {
      saved = route.request().postDataJSON().content;
      return route.fulfill({ json: { id: gameId } });
    }
    return route.fulfill({
      json: {
        id: gameId,
        game: "hueco",
        difficulty: 1,
        status: "published",
        weekNumber: 1,
        content: {
          before: "La ",
          answer: "mitocondria",
          after: " produce ATP.",
          distractors: ["membrana", "pared celular"],
          explanation: "La mitocondria produce ATP.",
          sourceId: "doc",
          evidence: "Evidencia",
        },
        source: { documento: "teoria.pdf" },
        evidence: "Evidencia",
      },
    });
  });

  await page.goto("/cursos");
  await expect(page.getByRole("link", { name: /Crear curso/ })).toHaveAttribute("href", "/docente/nuevo");
  await page.getByRole("link", { name: /Biología/ }).click();

  await expect(page).toHaveURL(new RegExp(`/docente/${courseId}$`));
  await expect(page.getByRole("tab")).toHaveText(["Ranking", "Alumnos", "Juegos"]);
  const rows = page.getByRole("listitem");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText("Ana Díaz");
  await expect(rows.first()).toContainText("120 pts");
  await page.screenshot({ path: "test-results/administracion-ranking.png", fullPage: true });

  await page.getByRole("tab", { name: "Alumnos" }).click();
  await expect(page.getByText("1 alumno en el curso")).toBeVisible();
  await page
    .getByLabel("Correos de los alumnos")
    .fill("nuevo@example.test, otro@example.test\ntercero@example.test");
  await page.getByRole("button", { name: "Asignar", exact: true }).click();
  await expect(page.getByText("4 alumnos en el curso")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("3 sin cuenta aún");
  await expect(page.getByText("Sin cuenta aún", { exact: true })).toHaveCount(3);
  await page.screenshot({ path: "test-results/administracion-alumnos.png", fullPage: true });
  await page.getByRole("button", { name: "Quitar a otro@example.test" }).click();
  await expect(page.getByText("3 alumnos en el curso")).toBeVisible();

  await page.getByRole("tab", { name: "Juegos" }).click();
  await expect(page.getByRole("button", { name: "Terminar" })).toHaveCount(0);
  await page.screenshot({ path: "test-results/administracion-juegos.png", fullPage: true });
  await page.getByRole("button", { name: "Editar Hueco, semana 1" }).click();
  await page.getByLabel("Respuesta correcta").fill("mitocondrias");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(saved).toMatchObject({ answer: "mitocondrias" });

  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }

  await page.goto("/cursos");
  await page.getByRole("link", { name: /Química/ }).click();
  await expect(page).toHaveURL(/\/docente\/in-setup$/);
  await expect(page.getByRole("tab", { name: "Juegos" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: "Terminar" })).toBeEnabled();
});

test("a student sees their courses but cannot create one", async ({ page }) => {
  await page.route("**/api/courses", (route) =>
    route.fulfill({
      json: {
        canCreateCourses: false,
        courses: [
          { id: courseId, name: "Biología", role: "student", setupCompleted: true, weeks: 2, games: 7 },
        ],
      },
    }),
  );
  await page.goto("/cursos");
  const course = page.getByRole("link", { name: /Biología/ });
  await expect(course).toHaveAttribute("href", `/cursos/${courseId}/practicar`);
  await expect(page.getByRole("link", { name: /Crear curso/ })).toHaveCount(0);
  await page.goto("/docente/nuevo");
  await expect(page).toHaveURL(/\/cursos$/);
});

test("a published challenge renders the existing Hueco GameShell and submits for feedback", async ({
  page,
}) => {
  const session = () => ({
    sessionId: "fixture-session",
    courseId,
    game: "hueco",
    difficulty: 1,
    week: 1,
    payload: {
      before: "La ",
      after: " produce ATP.",
      options: [
        { id: "opt-a", text: "mitocondria" },
        { id: "opt-b", text: "membrana" },
        { id: "opt-c", text: "pared celular" },
      ],
    },
    hintAvailable: true,
    startedAt: new Date().toISOString(),
    deadline: new Date(Date.now() + 20_000).toISOString(),
    serverTime: new Date().toISOString(),
  });
  const totals = { points: 0, streakDays: 0, weeklyPlayed: 1, weeklyLimit: 10 };
  await page.route(`**/api/courses/${courseId}/challenges`, (route) =>
    route.fulfill({
      json:
        route.request().method() === "POST"
          ? session()
          : {
              course: { name: "Biología", current_week: 1 },
              challenges: [
                {
                  id: "fixture",
                  game: "hueco",
                  difficulty: 1,
                  deadline: "2026-11-09T05:00:00.000Z",
                  played: false,
                  points: null,
                },
                {
                  id: "fixture-played",
                  game: "parejas",
                  difficulty: 1,
                  deadline: "2026-11-09T05:00:00.000Z",
                  played: true,
                  points: 5,
                },
              ],
            },
    }),
  );
  await page.route(`**/api/courses/${courseId}/progress`, (route) => route.fulfill({ json: totals }));
  await page.route("**/api/challenges/fixture-session", (route) => route.fulfill({ json: session() }));
  await page.route("**/api/challenges/fixture-session/answer", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ answer: { optionId: "opt-a" } });
    return route.fulfill({
      json: {
        correct: true,
        pointsAwarded: 10,
        timedOut: false,
        correctAnswer: { optionId: "opt-a", explanation: "La mitocondria produce ATP." },
        explanation: "La mitocondria produce ATP.",
        source: { documento: "teoria.pdf" },
        totals: { ...totals, points: 10 },
      },
    });
  });
  await page.goto(`/cursos/${courseId}/practicar`);
  await expect(page.getByRole("heading", { name: "Biología" })).toBeVisible();
  await expect(page.getByText("Semana 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Disponibles hasta lun 9 nov, 00:00")).toBeVisible();
  await expect(page.getByText("Jugado · +5 pts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Jugar", exact: true })).toHaveCount(1);
  await page.screenshot({ path: "test-results/practicar.png", fullPage: true });
  await page.getByRole("button", { name: "Jugar", exact: true }).click();
  await expect(page).toHaveURL(/\/reto\/fixture-session$/);
  await page.getByRole("button", { name: /mitocondria/i }).click();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  await expect(page.getByText("La mitocondria produce ATP.").first()).toBeVisible();
  await page.screenshot({ path: "test-results/generated-hueco.png", fullPage: true });
});

test("the running Next server rejects unauthenticated protected requests", async ({ request }) => {
  const materials = await request.get(`/api/courses/${courseId}/materials`);
  expect(materials.status()).toBe(401);
  const generation = await request.post(`/api/courses/${courseId}/generation`, { data: { weekNumber: 1 } });
  expect(generation.status()).toBe(401);
  const session = await request.get("/api/challenges/unknown-session");
  expect(session.status()).toBe(401);
  expect((await request.get("/api/courses")).status()).toBe(401);
  expect((await request.post("/api/courses", { data: { name: "Curso" } })).status()).toBe(401);
  expect((await request.get(`/api/courses/${courseId}`)).status()).toBe(401);
  expect((await request.post(`/api/courses/${courseId}/finish`, { data: {} })).status()).toBe(401);
});
