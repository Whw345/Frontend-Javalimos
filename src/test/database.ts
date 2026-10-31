import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

export async function createTestDatabase() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  `);
  for (const migration of [
    "202610300001_learning_pipeline.sql",
    "202610300002_better_auth.sql",
    "202610300003_drop_legacy_tables.sql",
    "202610300004_teacher_flow.sql",
    "202610300005_teachers.sql",
    "202610300006_course_admin.sql",
    "202610300007_first_week_open.sql",
    "202610300008_partial_scores.sql",
    "202610300009_remove_free_text.sql",
    "202610300010_reset_student_progress.sql",
    "202610300011_real_weekly_total.sql",
  ]) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), "utf8"));
  }
  return db;
}

// Minimal PostgREST test double backed by the actual PostgreSQL migration.
// Application queries and RPC functions execute SQL.
export function createTestClient(db: PGlite) {
  class Query {
    columns = "*";
    returning = false;
    operation = "select";
    value: unknown;
    filters: string[] = [];
    parameters: unknown[] = [];
    sort = "";
    one = false;
    constructor(public table: string) {
      if (!/^[a-z_]+$/.test(table)) throw new Error("Invalid test table.");
    }
    select(columns = "*") {
      this.columns = columns;
      this.returning = true;
      return this;
    }
    insert(value: unknown) {
      this.operation = "insert";
      this.value = value;
      return this;
    }
    update(value: unknown) {
      this.operation = "update";
      this.value = value;
      return this;
    }
    delete() {
      this.operation = "delete";
      return this;
    }
    eq(column: string, value: unknown) {
      this.parameters.push(value);
      this.filters.push(`${column} = $${this.parameters.length}`);
      return this;
    }
    in(column: string, values: unknown[]) {
      this.parameters.push(values);
      this.filters.push(`${column} = any($${this.parameters.length})`);
      return this;
    }
    order(column: string, options?: { ascending: boolean }) {
      this.sort = ` order by ${column} ${options?.ascending === false ? "desc" : "asc"}`;
      return this;
    }
    maybeSingle() {
      this.one = true;
      return this;
    }
    single() {
      this.one = true;
      return this;
    }
    async execute() {
      try {
        let sql = "";
        const parameters = [...this.parameters];
        const where = this.filters.length ? ` where ${this.filters.join(" and ")}` : "";
        if (this.operation === "insert") {
          const values = this.value as Record<string, unknown>;
          const keys = Object.keys(values);
          parameters.push(...Object.values(values));
          sql = `insert into ${this.table} (${keys.join(",")}) values (${keys.map((_, index) => `$${index + 1}`).join(",")}) returning ${this.columns}`;
        } else if (this.operation === "update") {
          const values = this.value as Record<string, unknown>;
          const updates = Object.entries(values).map(([key, value]) => {
            parameters.push(value);
            return `${key} = $${parameters.length}`;
          });
          sql = `update ${this.table} set ${updates.join(",")}${where} returning ${this.columns}`;
        } else if (this.operation === "delete") {
          sql = `delete from ${this.table}${where}`;
        } else {
          sql = `select ${this.columns} from ${this.table}${where}${this.sort}`;
        }
        const result = await db.query(sql, parameters);
        // Like PostgREST, a write returns no rows unless it chains .select().
        if (this.operation !== "select" && !this.returning) return { data: null, error: null };
        return { data: this.one ? (result.rows[0] ?? null) : result.rows, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
    then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
      return this.execute().then(resolve, reject);
    }
  }
  return {
    from: (table: string) => new Query(table),
    async rpc(name: string, args: Record<string, unknown>) {
      try {
        const keys = Object.keys(args);
        const result = await db.query<{ value: unknown }>(
          `select ${name}(${keys.map((key, index) => `${key} => $${index + 1}`).join(",")}) as value`,
          Object.values(args),
        );
        return { data: result.rows[0]!.value, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
  };
}
