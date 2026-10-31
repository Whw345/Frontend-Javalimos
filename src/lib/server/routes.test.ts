import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestClient, createTestDatabase } from "@/test/database";
import { POST as upload, PATCH as editMaterial } from "@/app/api/courses/[courseId]/materials/route";
import { POST as generate, PATCH as publish } from "@/app/api/courses/[courseId]/generation/route";
import { POST as start } from "@/app/api/courses/[courseId]/challenges/route";
import { GET as getSession } from "@/app/api/challenges/[sessionId]/route";
import { POST as answer } from "@/app/api/challenges/[sessionId]/answer/route";
import { POST as hint } from "@/app/api/challenges/[sessionId]/hint/route";

const state = vi.hoisted(() => ({ client: null as unknown, userId: "11111111-1111-4111-8111-111111111111" }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => state.client }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "test-token" }) }) }));
vi.mock("@/lib/server/model", () => ({
  createGatewayModel: () => ({
    generate: async () => ({
      challenge: {
        game: "hueco",
        before: "La ",
        after: " produce ATP.",
        answer: "mitocondria",
        distractors: ["pared celular", "membrana"],
        explanation: "La mitocondria produce ATP mediante la respiracion celular.",
        evidence: "La mitocondria produce ATP mediante la respiracion celular.",
        sourceId: theoryId,
      },
    }),
  }),
}));
vi.mock("@/lib/decision/provider", () => ({
  getConfiguredDecisionModel: () => ({
    complete: async () => ({
      recommendations: [
        {
          rank: 1,
          template: "fill_blank",
          difficulty: 1,
          score: 0.9,
          confidenceLevel: "high",
          reason: "Definiciones.",
        },
        {
          rank: 2,
          template: "matching",
          difficulty: 1,
          score: 0.8,
          confidenceLevel: "high",
          reason: "Conceptos.",
        },
        {
          rank: 3,
          template: "ordering",
          difficulty: 2,
          score: 0.6,
          confidenceLevel: "low",
          reason: "Proceso.",
        },
      ],
    }),
  }),
}));

let db: PGlite;
let theoryId = "";
const teacher = state.userId;
const student = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
const course = { params: Promise.resolve({ courseId: "bio-101" }) };
const request = (path: string, method: string, body: unknown) =>
  new Request(`http://localhost/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify(body),
  });
const sessionContext = (id: string) => ({ params: Promise.resolve({ sessionId: id }) });

beforeAll(async () => {
  vi.stubEnv("SUPABASE_URL", "http://localhost.test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
  db = await createTestDatabase();
  state.client = createTestClient(db, () => state.userId || null);
  await db.query("insert into auth.users(id) values ($1),($2),($3)", [teacher, student, outsider]);
  await db.exec("insert into courses(id,name) values ('bio-101','Biologia'),('other','Otro curso')");
  await db.query(
    "insert into course_members(course_id,user_id,role) values ('bio-101',$1,'teacher'),('bio-101',$2,'student')",
    [teacher, student],
  );
}, 30_000);
afterAll(async () => {
  await db?.close();
  vi.unstubAllEnvs();
});

it("runs real upload routes through PDF extraction, week confirmation, SQL persistence, publication, session and grading", async () => {
  async function uploadFixture(name: string, kind: string) {
    const form = new FormData();
    form.set("kind", kind);
    form.set(
      "file",
      new File([await readFile(new URL(`../../../fixtures/${name}`, import.meta.url))], name, {
        type: "application/pdf",
      }),
    );
    const result = await upload(
      new Request("http://localhost/api/courses/bio-101/materials", { method: "POST", body: form }),
      course,
    );
    expect(result.status).toBe(200);
    return result.json();
  }
  const syllabus = await uploadFixture("silabo.pdf", "syllabus");
  const theory = await uploadFixture("teoria.pdf", "theory");
  theoryId = theory.id;
  expect((state.client as ReturnType<typeof createTestClient>).files.size).toBe(2);
  expect(
    (
      await editMaterial(
        request("materials", "PATCH", {
          action: "confirm",
          syllabusId: syllabus.id,
          weeks: syllabus.suggestedWeeks,
        }),
        course,
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await editMaterial(
        request("materials", "PATCH", { action: "assign", documentId: theory.id, weekNumbers: [1] }),
        course,
      )
    ).status,
  ).toBe(200);
  const generated = await generate(request("generation", "POST", { weekNumber: 1 }), course);
  expect(generated.status).toBe(200);
  const challenge = await generated.json();
  expect(challenge.status).toBe("draft");
  expect(
    (
      await publish(
        request("generation", "PATCH", { challengeId: challenge.id, status: "published" }),
        course,
      )
    ).status,
  ).toBe(200);

  state.userId = student;
  const started = await start(request("challenges", "POST", { game: "hueco", difficulty: 1 }), course);
  expect(started.status).toBe(200);
  const session = await started.json();
  expect(session).not.toHaveProperty("solution");
  const loaded = await getSession(new Request("http://localhost/session"), sessionContext(session.sessionId));
  expect(loaded.status).toBe(200);
  expect(await loaded.json()).not.toHaveProperty("correctAnswer");
  expect((await hint(request("hint", "POST", {}), sessionContext(session.sessionId))).status).toBe(200);
  const option = session.payload.options.find((item: { text: string }) => item.text === "mitocondria");
  const submitted = await answer(
    request("answer", "POST", { answer: { optionId: option.id } }),
    sessionContext(session.sessionId),
  );
  expect(submitted.status).toBe(200);
  const result = await submitted.json();
  expect(result).toMatchObject({
    correct: true,
    pointsAwarded: 5,
    timedOut: false,
    source: { documento: "teoria.pdf" },
    totals: { points: 5, weeklyPlayed: 1, weeklyLimit: 10 },
  });
  expect(
    (
      await answer(
        request("answer", "POST", { answer: { optionId: option.id } }),
        sessionContext(session.sessionId),
      )
    ).status,
  ).toBe(409);
  state.userId = outsider;
  expect(
    (await getSession(new Request("http://localhost/session"), sessionContext(session.sessionId))).status,
  ).toBe(404);
}, 30_000);

it("denies student uploads, outsiders, unauthenticated access and cross-origin mutations", async () => {
  state.userId = student;
  expect((await generate(request("generation", "POST", { weekNumber: 1 }), course)).status).toBe(403);
  state.userId = outsider;
  expect((await generate(request("generation", "POST", { weekNumber: 1 }), course)).status).toBe(403);
  state.userId = "";
  expect((await generate(request("generation", "POST", { weekNumber: 1 }), course)).status).toBe(401);
  const crossOrigin = new Request("http://localhost/generation", {
    method: "POST",
    headers: { Origin: "https://evil.example" },
    body: "{}",
  });
  expect((await generate(crossOrigin, course)).status).toBe(403);
});

it("enforces quota, timeout, hint points and replay rules in PostgreSQL", async () => {
  state.userId = student;
  const source = await db.query<{ id: string }>("select id from generated_challenges limit 1");
  for (let index = 0; index < 10; index++) {
    await db.query(
      `insert into generated_challenges(course_id,week_number,game,difficulty,payload,solution,hint,explanation,source,source_document_id,evidence,decision,status)
      select course_id,week_number,game,difficulty,payload,solution,hint,explanation,source,source_document_id,evidence,decision,status from generated_challenges where id = $1`,
      [source.rows[0]!.id],
    );
  }
  const first = await db.query<{ value: { id: string } }>(
    "select start_challenge('bio-101',$1,'hueco',1) as value",
    [student],
  );
  const id = first.rows[0]!.value.id;
  await db.query("update challenge_sessions set deadline = now() - interval '1 second' where id = $1", [id]);
  const expired = await db.query<{ value: unknown }>("select finish_challenge($1,$2,true,null) as value", [
    id,
    student,
  ]);
  expect(expired.rows[0]!.value).toMatchObject({ pointsAwarded: 0, timedOut: true });
  await expect(db.query("select reveal_session_hint($1,$2)", [id, student])).rejects.toThrow(
    "CHALLENGE_EXPIRED",
  );
  const second = await db.query<{ value: { id: string } }>(
    "select start_challenge('bio-101',$1,'hueco',1) as value",
    [student],
  );
  const correct = await db.query<{ value: unknown }>("select finish_challenge($1,$2,true,null) as value", [
    second.rows[0]!.value.id,
    student,
  ]);
  expect(correct.rows[0]!.value).toMatchObject({ pointsAwarded: 10, timedOut: false });
  for (let count = 3; count < 10; count++)
    await db.query("select start_challenge('bio-101',$1,'hueco',1)", [student]);
  await expect(db.query("select start_challenge('bio-101',$1,'hueco',1)", [student])).rejects.toThrow(
    "WEEKLY_LIMIT_REACHED",
  );
  await expect(db.query("select start_challenge('other',$1,'hueco',1)", [student])).rejects.toThrow(
    "FORBIDDEN",
  );
  await db.exec("set role authenticated");
  await expect(db.query("select solution from generated_challenges")).rejects.toThrow("permission denied");
  await expect(db.query("select course_progress('bio-101',$1)", [student])).rejects.toThrow(
    "permission denied",
  );
  await db.exec("reset role");
});
