import { test, expect } from "@playwright/test";

test("login and teacher workspace preserve responsive layout and accept a PDF upload", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({ json: { signedIn: true } }));
  await page.goto("/ingresar");
  await page.getByLabel("Correo institucional").fill("docente@example.test");
  await page.getByLabel("Contraseña").fill("fixture-password");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Sesión iniciada");
  await page.route("**/api/courses/bio-101/materials", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
      return route.fulfill({ json: { id: "document", suggestedWeeks: [] } });
    }
    return route.fulfill({
      json: { documents: [], weeks: [], assignments: [], challenges: [], suggestedWeeks: [] },
    });
  });
  await page.getByRole("link", { name: "Gestionar material como docente" }).click();
  await expect(page.getByRole("heading", { name: "1. Carga el sílabo y la teoría" })).toBeVisible();
  await page.getByLabel("Archivo PDF").setInputFiles("fixtures/silabo.pdf");
  await page.getByRole("button", { name: "Cargar y procesar PDF" }).click();
  await expect(page.getByRole("status")).toContainText("PDF convertido y guardado");
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 720 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.screenshot({ path: "test-results/teacher-workspace.png", fullPage: true });
});

test("a published challenge renders the existing Hueco GameShell and submits for feedback", async ({
  page,
}) => {
  const session = () => ({
    sessionId: "fixture-session",
    courseId: "bio-101",
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
  await page.route("**/api/courses/bio-101/challenges", (route) =>
    route.fulfill({
      json:
        route.request().method() === "POST"
          ? session()
          : {
              course: { name: "Biología", current_week: 1 },
              challenges: [{ id: "fixture", game: "hueco", difficulty: 1 }],
            },
    }),
  );
  await page.route("**/api/courses/bio-101/progress", (route) => route.fulfill({ json: totals }));
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
  await page.goto("/cursos/bio-101/practicar");
  await page.getByRole("button", { name: "Jugar", exact: true }).click();
  await expect(page).toHaveURL(/\/reto\/fixture-session$/);
  await page.getByRole("button", { name: /mitocondria/i }).click();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  await expect(page.getByText("La mitocondria produce ATP.").first()).toBeVisible();
  await page.screenshot({ path: "test-results/generated-hueco.png", fullPage: true });
});

test("the running Next server rejects unauthenticated protected requests", async ({ request }) => {
  const materials = await request.get("/api/courses/bio-101/materials");
  expect(materials.status()).toBe(401);
  const generation = await request.post("/api/courses/bio-101/generation", { data: { weekNumber: 1 } });
  expect(generation.status()).toBe(401);
  const session = await request.get("/api/challenges/unknown-session");
  expect(session.status()).toBe(401);
});
