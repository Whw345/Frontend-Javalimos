import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestClient, createTestDatabase } from "@/test/database";
import { POST as upload, PATCH as editMaterial } from "@/app/api/courses/[courseId]/materials/route";
import { GET as listCourses, POST as createCourse } from "@/app/api/courses/route";
import { GET as getPath } from "@/app/api/courses/[courseId]/route";
import { POST as finish } from "@/app/api/courses/[courseId]/finish/route";
import { GET as getGame, PATCH as editGame } from "@/app/api/courses/[courseId]/games/[gameId]/route";
import { GET as getLeaderboard } from "@/app/api/courses/[courseId]/leaderboard/route";
import {
  DELETE as remove,
  GET as getStudents,
  POST as assign,
} from "@/app/api/courses/[courseId]/students/route";
import { POST as generate, PATCH as publish } from "@/app/api/courses/[courseId]/generation/route";
import { GET as weekChallenges, POST as start } from "@/app/api/courses/[courseId]/challenges/route";
import { GET as getSession } from "@/app/api/challenges/[sessionId]/route";
import { firstMonday, weekWindow } from "@/lib/utils/schedule";
import { POST as answer } from "@/app/api/challenges/[sessionId]/answer/route";
import { POST as hint } from "@/app/api/challenges/[sessionId]/hint/route";

const state = vi.hoisted(() => ({
  client: null as unknown,
  userId: "11111111-1111-4111-8111-111111111111",
  failFill: false,
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => state.client }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: "better-auth.session_token=test-token" }),
}));
vi.mock("@/lib/server/auth", () => ({
  auth: { api: { getSession: async () => (state.userId ? { user: { id: state.userId } } : null) } },
}));
vi.mock("@/lib/server/model", () => ({
  createGatewayModel: () => ({
    complete: async (_schema: unknown, _instructions: string, input: string) => {
      if (state.failFill) throw new Error("provider down");
      const { sources } = JSON.parse(input) as { sources: { id: string }[] };
      return {
        hueco: {
          before: "La ",
          after: " produce ATP.",
          answer: "mitocondria",
          distractors: ["pared celular", "membrana"],
          explanation: "La mitocondria produce ATP mediante la respiracion celular.",
          evidence: "La mitocondria produce ATP mediante la respiracion celular.",
          sourceId: sources[0]!.id,
        },
      };
    },
  }),
}));
vi.mock("@/lib/decision/provider", () => ({
  getConfiguredGameDecisionModel: () => ({
    ask: async () => (await import("@/test/decisions")).decisionAnswers("hueco"),
  }),
}));

let db: PGlite;
const teacher = state.userId;
const student = "22222222-2222-4222-8222-222222222222";
const outsider = "33333333-3333-4333-8333-333333333333";
const courseId = "44444444-4444-4444-8444-444444444444";
const otherCourseId = "55555555-5555-4555-8555-555555555555";
const course = { params: Promise.resolve({ courseId }) };
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
  state.client = createTestClient(db);
  for (const id of [teacher, student, outsider]) {
    await db.query(`insert into "user"(id,name,email,"emailVerified") values ($1,$1,$1,true)`, [id]);
  }
  await db.query("insert into teachers(user_id) values ($1)", [teacher]);
  await db.exec(
    `insert into courses(id,name) values ('${courseId}','Biologia'),('${otherCourseId}','Otro curso')`,
  );
  await db.query(
    `insert into course_members(course_id,user_id,role) values ('${courseId}',$1,'teacher'),('${courseId}',$2,'student')`,
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
      new Request(`http://localhost/api/courses/${courseId}/materials`, { method: "POST", body: form }),
      course,
    );
    expect(result.status).toBe(200);
    return result.json();
  }
  const syllabus = await uploadFixture("silabo.pdf", "syllabus");
  const theory = await uploadFixture("teoria.pdf", "theory");
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
  expect(await generated.json()).toEqual({ weekNumber: 1, games: 1 });
  const stored = await db.query<{ id: string; status: string }>(
    "select id, status from generated_challenges where course_id = $1",
    [courseId],
  );
  const challenge = stored.rows[0]!;
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

it("generates course ids and rejects malformed ones before reaching PostgreSQL", async () => {
  const created = await db.query<{ id: string }>("insert into courses(name) values ('Nuevo') returning id");
  expect(created.rows[0]!.id).toMatch(/^[0-9a-f-]{36}$/);
  state.userId = student;
  const malformed = { params: Promise.resolve({ courseId: "bio-101" }) };
  const result = await start(request("courses/bio-101/challenges", "POST", {}), malformed);
  expect(result.status).toBe(403);
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
    `select start_challenge('${courseId}',$1,'hueco',1) as value`,
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
    `select start_challenge('${courseId}',$1,'hueco',1) as value`,
    [student],
  );
  const correct = await db.query<{ value: unknown }>("select finish_challenge($1,$2,true,null) as value", [
    second.rows[0]!.value.id,
    student,
  ]);
  expect(correct.rows[0]!.value).toMatchObject({ pointsAwarded: 10, timedOut: false });
  for (let count = 3; count < 10; count++)
    await db.query(`select start_challenge('${courseId}',$1,'hueco',1)`, [student]);
  await expect(db.query(`select start_challenge('${courseId}',$1,'hueco',1)`, [student])).rejects.toThrow(
    "WEEKLY_LIMIT_REACHED",
  );
  await expect(
    db.query(`select start_challenge('${otherCourseId}',$1,'hueco',1)`, [student]),
  ).rejects.toThrow("FORBIDDEN");
  await db.exec("set role authenticated");
  await expect(db.query("select solution from generated_challenges")).rejects.toThrow("permission denied");
  await expect(db.query(`select course_progress('${courseId}',$1)`, [student])).rejects.toThrow(
    "permission denied",
  );
  await db.exec("reset role");
});

it("takes a teacher from a new course to a finished path", async () => {
  state.userId = teacher;
  const created = await createCourse(request("courses", "POST", { name: "Citologia" }));
  expect(created.status).toBe(200);
  const { id } = await created.json();
  const context = { params: Promise.resolve({ courseId: id }) };
  const listed = await (await listCourses()).json();
  expect(listed.canCreateCourses).toBe(true);
  expect(listed.courses[0]).toMatchObject({ id, role: "teacher", setupCompleted: false, weeks: 0 });

  async function uploadToWeek(week: number) {
    const form = new FormData();
    form.set("kind", "theory");
    form.set("week", String(week));
    form.set(
      "file",
      new File(
        [await readFile(new URL("../../../fixtures/teoria.pdf", import.meta.url))],
        "tema_celular.pdf",
        {
          type: "application/pdf",
        },
      ),
    );
    const result = await upload(
      new Request(`http://localhost/api/courses/${id}/materials`, { method: "POST", body: form }),
      context,
    );
    expect(result.status).toBe(200);
  }
  await uploadToWeek(1);
  await uploadToWeek(2);
  await uploadToWeek(2);
  const documents = () =>
    db.query<{ storage_path: string | null; markdown: string | null }>(
      "select storage_path, markdown from course_documents where course_id = $1",
      [id],
    );
  expect((await documents()).rows.every((row) => row.storage_path === null && row.markdown)).toBe(true);

  const path = await (await getPath(new Request("http://localhost"), context)).json();
  const monday = firstMonday(new Date());
  expect(path.weeks).toMatchObject([
    {
      weekNumber: 1,
      topic: "tema celular",
      generationStatus: "pending",
      deadline: weekWindow(monday, 1).deadline,
    },
    {
      weekNumber: 2,
      topic: "tema celular · tema celular",
      generationStatus: "pending",
      deadline: weekWindow(monday, 2).deadline,
    },
  ]);

  await db.query(
    "update course_weeks set generation_status = 'running', generation_started_at = now() where course_id = $1 and week_number = 1",
    [id],
  );
  expect((await generate(request("generation", "POST", { weekNumber: 1 }), context)).status).toBe(409);
  await db.query(
    "update course_weeks set generation_started_at = now() - interval '6 minutes' where course_id = $1 and week_number = 1",
    [id],
  );
  const stalled = await (await getPath(new Request("http://localhost"), context)).json();
  expect(stalled.weeks[0]).toMatchObject({
    generationStatus: "failed",
    generationError: "La generación se interrumpió. Inténtalo de nuevo.",
  });
  expect((await generate(request("generation", "POST", { weekNumber: 1 }), context)).status).toBe(200);
  const stored = await db.query<{ deadline: Date; opens_at: Date | null; difficulty: number; id: string }>(
    "select id, deadline, opens_at, difficulty from generated_challenges where course_id = $1",
    [id],
  );
  expect(stored.rows).toHaveLength(1);
  expect(stored.rows[0]!.opens_at).toBeNull();
  expect(stored.rows[0]!.deadline.toISOString()).toBe(new Date(weekWindow(monday, 1).deadline).toISOString());

  const gameId = stored.rows[0]!.id;
  const gameContext = { params: Promise.resolve({ courseId: id, gameId }) };
  const game = await (await getGame(new Request("http://localhost"), gameContext)).json();
  expect(game).toMatchObject({ game: "hueco", weekNumber: 1, content: { answer: "mitocondria" } });

  state.userId = student;
  expect((await getGame(new Request("http://localhost"), gameContext)).status).toBe(403);
  state.userId = teacher;
  const edited = await editGame(
    request("games", "PATCH", { content: { ...game.content, answer: "mitocondrias", evidence: "Falsa" } }),
    gameContext,
  );
  expect(edited.status).toBe(200);
  const rebuilt = await db.query<{
    payload: { options: { id: string; text: string }[] };
    solution: { optionId: string };
    content: { evidence: string };
  }>("select payload, solution, content from generated_challenges where id = $1", [gameId]);
  const row = rebuilt.rows[0]!;
  expect(row.payload.options.find((option) => option.id === row.solution.optionId)?.text).toBe(
    "mitocondrias",
  );
  expect(row.content.evidence).toBe(game.content.evidence);
  const duplicated = await editGame(
    request("games", "PATCH", { content: { ...game.content, distractors: ["mitocondria", "otro"] } }),
    gameContext,
  );
  expect(duplicated.status).toBe(422);

  expect((await finish(request("finish", "POST", {}), context)).status).toBe(409);
  state.failFill = true;
  expect((await generate(request("generation", "POST", { weekNumber: 2 }), context)).status).toBe(503);
  state.failFill = false;
  const failedPath = await (await getPath(new Request("http://localhost"), context)).json();
  expect(failedPath.weeks[1]).toMatchObject({
    generationStatus: "failed",
    generationError: "No se pudieron generar los juegos de esta semana.",
    games: [],
  });
  expect((await generate(request("generation", "POST", { weekNumber: 2 }), context)).status).toBe(200);

  const finished = await finish(request("finish", "POST", {}), context);
  expect(await finished.json()).toEqual({ published: 2 });
  const kept = await documents();
  expect(kept.rows).toHaveLength(3);
  expect(kept.rows.every((row) => row.markdown === null)).toBe(true);
  const games = await db.query<{ evidence: string; source: { documento: string } }>(
    "select evidence, source from generated_challenges where course_id = $1",
    [id],
  );
  expect(games.rows[0]).toMatchObject({ source: { documento: "tema_celular.pdf" } });
  expect(games.rows[0]!.evidence).toContain("mitocondria");
  expect((await generate(request("generation", "POST", { weekNumber: 1 }), context)).status).toBe(409);
  const donePath = await (await getPath(new Request("http://localhost"), context)).json();
  expect(donePath.course.setupCompleted).toBe(true);
  expect(
    donePath.weeks.flatMap((week: { games: { status: string }[] }) => week.games.map((item) => item.status)),
  ).toEqual(["published", "published"]);

  const inPlay = await db.query<{ id: string }>(
    `insert into challenge_sessions(user_id,course_id,week_number,challenge_id,deadline)
    values ($1,$2,1,$3,now() + interval '1 minute') returning id`,
    [student, id, gameId],
  );
  const blocked = await editGame(request("games", "PATCH", { content: game.content }), gameContext);
  expect(blocked.status).toBe(409);
  expect(await blocked.json()).toMatchObject({ code: "GAME_IN_PLAY" });
  await db.query("update challenge_sessions set answered_at = now() where id = $1", [inPlay.rows[0]!.id]);
  expect((await editGame(request("games", "PATCH", { content: game.content }), gameContext)).status).toBe(
    200,
  );
  await db.query("update generated_challenges set status = 'discarded' where id = $1", [gameId]);
  expect((await editGame(request("games", "PATCH", { content: game.content }), gameContext)).status).toBe(
    409,
  );
}, 30_000);

it("assigns students by email, with or without an account, and ranks them by points", async () => {
  const id = "77777777-7777-4777-8777-777777777777";
  const ana = "88888888-8888-4888-8888-888888888888";
  const context = { params: Promise.resolve({ courseId: id }) };
  const body = async (response: Response) => response.json();
  const roster = async () =>
    (await body(await getStudents(new Request("http://localhost"), context))).students;
  const ranking = async () =>
    (await body(await getLeaderboard(new Request("http://localhost"), context))).leaderboard;
  await db.exec(`insert into courses(id,name) values ('${id}','Genetica')`);
  await db.query(`insert into course_members(course_id,user_id,role) values ('${id}',$1,'teacher')`, [
    teacher,
  ]);
  await db.query(`update "user" set email = 'docente@example.test' where id = $1`, [teacher]);
  await db.query(
    `insert into "user"(id,name,email,"emailVerified") values ($1,'Ana Diaz','ana@example.test',true)`,
    [ana],
  );

  state.userId = teacher;
  expect(await ranking()).toEqual([]);
  const assigned = await assign(
    request("students", "POST", {
      emails: [" ANA@example.test ", "ana@example.test", "nuevo@example.test", "docente@example.test"],
    }),
    context,
  );
  expect(await assigned.json()).toEqual({ enrolled: 1, invited: 1 });
  expect(await roster()).toEqual([
    { email: "ana@example.test", name: "Ana Diaz", pending: false },
    { email: "nuevo@example.test", name: null, pending: true },
  ]);
  const members = await db.query<{ role: string }>(
    "select role from course_members where course_id = $1 and user_id = $2",
    [id, teacher],
  );
  expect(members.rows[0]!.role).toBe("teacher");
  const invalid = await assign(request("students", "POST", { emails: ["no-es-correo"] }), context);
  expect(invalid.status).toBe(422);
  expect((await invalid.json()).message).toContain("no-es-correo");

  // Registrarse con ese correo, con contraseña o Google, inscribe sin pasos extra.
  await db.query(
    `insert into "user"(id,name,email,"emailVerified") values ('nuevo','Nuevo Alumno','Nuevo@example.test',true)`,
  );
  await db.query(`update "user" set email = 'nuevo@example.test' where id = 'nuevo'`);
  expect((await roster()).map((item: { pending: boolean }) => item.pending)).toEqual([false, false]);
  expect((await db.query("select 1 from course_invites where course_id = $1", [id])).rows).toHaveLength(0);

  const challenge = await db.query<{ id: string }>("select id from generated_challenges limit 1");
  await db.query(
    `insert into challenge_sessions(user_id,course_id,week_number,challenge_id,deadline,answered_at,points)
    values ($1,$2,1,$3,now(),now(),10),($1,$2,1,$3,now(),now(),5),($1,$2,1,$3,now(),null,0)`,
    [ana, id, challenge.rows[0]!.id],
  );
  expect(await ranking()).toEqual([
    { userId: ana, name: "Ana Diaz", points: 15, played: 2, rank: 1 },
    { userId: "nuevo", name: "Nuevo Alumno", points: 0, played: 0, rank: 2 },
  ]);

  state.userId = student;
  expect((await getLeaderboard(new Request("http://localhost"), context)).status).toBe(403);
  expect((await getStudents(new Request("http://localhost"), context)).status).toBe(403);
  expect((await assign(request("students", "POST", { emails: ["a@b.co"] }), context)).status).toBe(403);
  expect((await remove(request("students", "DELETE", { email: "ana@example.test" }), context)).status).toBe(
    403,
  );
  state.userId = "";
  expect((await getLeaderboard(new Request("http://localhost"), context)).status).toBe(401);
  expect((await assign(request("students", "POST", { emails: ["a@b.co"] }), context)).status).toBe(401);

  state.userId = teacher;
  expect((await remove(request("students", "DELETE", { email: "ANA@example.test" }), context)).status).toBe(
    200,
  );
  expect((await roster()).map((item: { email: string }) => item.email)).toEqual(["nuevo@example.test"]);
  expect((await ranking()).map((item: { name: string }) => item.name)).toEqual(["Nuevo Alumno"]);
  await db.exec("set role authenticated");
  await expect(db.query("select email from course_invites")).rejects.toThrow("permission denied");
  await expect(db.query(`select course_roster('${id}')`)).rejects.toThrow("permission denied");
  await db.exec("reset role");
}, 30_000);

it("lets an assigned student play only the current week, from before the first Monday on", async () => {
  const id = "abababab-abab-4bab-8bab-abababababab";
  const documentId = "cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd";
  const week1 = "99999999-9999-4999-8999-999999999991";
  const week2 = "99999999-9999-4999-8999-999999999992";
  const draft = "99999999-9999-4999-8999-999999999993";
  const context = { params: Promise.resolve({ courseId: id }) };
  const list = () => weekChallenges(new Request("http://localhost"), context);
  const open = (challengeId: string) =>
    start(request("challenges", "POST", { game: "hueco", difficulty: 1, challengeId }), context);

  await db.exec(`
    insert into courses(id,name,starts_on) values ('${id}','Semanal',current_date + 3);
    insert into course_weeks(course_id,week_number,topic,confirmed) values ('${id}',1,'Uno',true),('${id}',2,'Dos',true);
  `);
  await db.query(
    `insert into course_documents(id,course_id,uploaded_by,kind,filename) values ('${documentId}','${id}',$1,'theory','tema.pdf')`,
    [teacher],
  );
  const insertGame = (gameId: string, week: number, status: string, opens: string, deadline: string) =>
    db.query(
      `insert into generated_challenges(id,course_id,week_number,game,difficulty,payload,solution,hint,explanation,source,source_document_id,evidence,decision,status,opens_at,deadline)
      values ($1,'${id}',$2,'hueco',1,'{}','{"optionId":"a","explanation":"Por esto."}','{}','Por esto.','{"documento":"tema.pdf"}','${documentId}','cita','{}',$3,${opens},${deadline})`,
      [gameId, week, status],
    );
  await insertGame(week1, 1, "published", "null", "now() + interval '10 days'");
  await insertGame(draft, 1, "draft", "null", "now() + interval '10 days'");
  await insertGame(week2, 2, "published", "now() + interval '10 days'", "now() + interval '17 days'");

  state.userId = student;
  expect((await list()).status).toBe(403);
  expect((await open(week1)).status).toBe(403);
  await db.query("select assign_course_students($1,$2)", [id, [student]]);

  const before = await (await list()).json();
  expect(before.course).toEqual({ name: "Semanal", current_week: 1 });
  expect(before.challenges).toMatchObject([{ id: week1, played: false, points: null }]);
  expect(JSON.stringify(before)).not.toContain("optionId");
  const listed = await (await listCourses()).json();
  expect(listed.courses.find((item: { id: string }) => item.id === id)).toMatchObject({
    role: "student",
    games: 2,
  });

  expect((await open(week2)).status).toBe(422);
  const started = await open(week1);
  expect(started.status).toBe(200);
  const session = await started.json();
  expect(session.week).toBe(1);
  const answered = await answer(
    request("answer", "POST", { answer: { optionId: "a" } }),
    sessionContext(session.sessionId),
  );
  expect(await answered.json()).toMatchObject({ correct: true, pointsAwarded: 10 });
  expect((await (await list()).json()).challenges).toMatchObject([{ id: week1, played: true, points: 10 }]);
  expect((await open(week1)).status).toBe(422);

  await db.exec(`
    update courses set starts_on = current_date - 7 where id = '${id}';
    update generated_challenges set opens_at = now() - interval '1 day' where id = '${week2}';
    update generated_challenges set deadline = now() - interval '1 day' where id = '${week1}';
  `);
  const next = await (await list()).json();
  expect(next.course.current_week).toBe(2);
  expect(next.challenges).toMatchObject([{ id: week2, played: false }]);

  state.userId = outsider;
  expect((await list()).status).toBe(403);
}, 30_000);

it("rejects courses without a usable name and anonymous listings", async () => {
  state.userId = teacher;
  expect((await createCourse(request("courses", "POST", { name: " " }))).status).toBe(422);
  state.userId = "";
  expect((await listCourses()).status).toBe(401);
  expect((await createCourse(request("courses", "POST", { name: "Sin sesion" }))).status).toBe(401);
});

it("lets only listed teachers create courses, whatever the browser sends", async () => {
  state.userId = student;
  const listed = await (await listCourses()).json();
  expect(listed.canCreateCourses).toBe(false);
  const denied = await createCourse(
    request("courses", "POST", { name: "Curso del alumno", role: "teacher", canCreateCourses: true }),
  );
  expect(denied.status).toBe(403);
  await expect(db.query("select create_course('Directo', $1, '2026-11-02')", [student])).rejects.toThrow(
    "NOT_A_TEACHER",
  );
  const courses = await db.query("select id from courses where name = 'Curso del alumno'");
  expect(courses.rows).toHaveLength(0);
  await db.exec("set role authenticated");
  await expect(db.query("select user_id from teachers")).rejects.toThrow("permission denied");
  await db.exec("reset role");
});
