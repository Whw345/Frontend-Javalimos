"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "./Workspace.module.css";

type Week = { weekNumber: number; topic: string; startsOn: string | null };
type Material = { id: string; kind: string; filename: string; markdown: string };
type Challenge = {
  id: string;
  game: string;
  week_number: number;
  difficulty: number;
  status: string;
  payload: unknown;
  solution: unknown;
  evidence: string;
  explanation: string;
};
type WorkspaceData = {
  documents: Material[];
  weeks: { week_number: number; topic: string; starts_on: string | null }[];
  assignments: { document_id: string; week_number: number }[];
  challenges: Challenge[];
  suggestedWeeks: Week[];
};

async function callApi(path: string, init?: RequestInit) {
  const response = await fetch(path, init);
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? "No se pudo completar la operación.");
  return body;
}
const jsonRequest = (method: string, data: unknown) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export function TeacherWorkspace({ courseId }: { courseId: string }) {
  const base = `/api/courses/${encodeURIComponent(courseId)}`;
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const result: WorkspaceData = await callApi(`${base}/materials`);
    setData(result);
    setWeeks(
      result.weeks.length
        ? result.weeks.map((week) => ({
            weekNumber: week.week_number,
            topic: week.topic,
            startsOn: week.starts_on,
          }))
        : result.suggestedWeeks,
    );
  }, [base]);
  useEffect(() => {
    let active = true;
    void callApi(`${base}/materials`)
      .then((result: WorkspaceData) => {
        if (!active) return;
        setData(result);
        setWeeks(
          result.weeks.length
            ? result.weeks.map((week) => ({
                weekNumber: week.week_number,
                topic: week.topic,
                startsOn: week.starts_on,
              }))
            : result.suggestedWeeks,
        );
      })
      .catch((error: Error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [base]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo completar la operación.");
    } finally {
      setBusy(false);
    }
  }
  function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void run(
      () => callApi(`${base}/materials`, { method: "POST", body: form }),
      "PDF convertido y guardado. Revisa el texto extraído.",
    );
  }
  function updateWeek(index: number, patch: Partial<Week>) {
    setWeeks((current) =>
      current.map((week, position) => (position === index ? { ...week, ...patch } : week)),
    );
  }
  const syllabus = data?.documents.filter((document) => document.kind === "syllabus").at(-1);
  return (
    <div className={styles.workspace}>
      <main>
        <header>
          <h1>Material del curso · {courseId}</h1>
          <Link href="/ingresar">Cambiar sesión</Link>
        </header>
        <p role="status" aria-live="polite">
          {message}
        </p>
        {data && (
          <>
            <section>
              <h2>1. Carga el sílabo y la teoría</h2>
              <p>PDF con texto seleccionable, hasta 4 MB por archivo. Los originales no se guardan.</p>
              <form onSubmit={upload}>
                <label>
                  Tipo de material
                  <select name="kind">
                    <option value="syllabus">Sílabo</option>
                    <option value="theory">Material teórico</option>
                  </select>
                </label>
                <label>
                  Archivo PDF
                  <input type="file" name="file" accept="application/pdf,.pdf" required />
                </label>
                <Button type="submit" loading={busy}>
                  Cargar y procesar PDF
                </Button>
              </form>
              {data.documents.map((document) => (
                <details key={document.id}>
                  <summary>
                    {document.filename} · {document.kind === "syllabus" ? "Sílabo" : "Teoría"}
                  </summary>
                  <pre>{document.markdown}</pre>
                </details>
              ))}
            </section>
            <section>
              <h2>2. Confirma semanas y temas</h2>
              <p>
                Revisa el sílabo y corrige las sugerencias. Las fechas son opcionales y deben provenir del
                calendario del curso.
              </p>
              {weeks.map((week, index) => (
                <div key={index} className={styles.row}>
                  <label>
                    Semana
                    <input
                      type="number"
                      min="1"
                      max="52"
                      value={week.weekNumber}
                      onChange={(event) => updateWeek(index, { weekNumber: Number(event.target.value) })}
                    />
                  </label>
                  <label>
                    Tema
                    <input
                      value={week.topic}
                      maxLength={160}
                      onChange={(event) => updateWeek(index, { topic: event.target.value })}
                    />
                  </label>
                  <label>
                    Inicio opcional
                    <input
                      type="date"
                      value={week.startsOn ?? ""}
                      onChange={(event) => updateWeek(index, { startsOn: event.target.value || null })}
                    />
                  </label>
                  <Button
                    variant="ghost"
                    onClick={() => setWeeks((current) => current.filter((_, position) => position !== index))}
                  >
                    Quitar
                  </Button>
                </div>
              ))}
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  setWeeks((current) => [
                    ...current,
                    {
                      weekNumber: Math.max(0, ...current.map((week) => week.weekNumber)) + 1,
                      topic: "",
                      startsOn: null,
                    },
                  ])
                }
              >
                Añadir semana
              </Button>
              <Button
                disabled={!syllabus || !weeks.length}
                loading={busy}
                onClick={() =>
                  run(
                    () =>
                      callApi(
                        `${base}/materials`,
                        jsonRequest("PATCH", { action: "confirm", syllabusId: syllabus?.id, weeks }),
                      ),
                    "Semanas confirmadas.",
                  )
                }
              >
                Confirmar semanas del sílabo
              </Button>
            </section>
            <section>
              <h2>3. Asigna teoría a las semanas confirmadas</h2>
              <p>
                La asignación utiliza el documento completo. Asigna cada PDF únicamente a las semanas cuyo
                contenido cubre.
              </p>
              {data.documents
                .filter((document) => document.kind === "theory")
                .map((document) => (
                  <form
                    key={`${document.id}-${data.assignments.length}`}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const selected = new FormData(event.currentTarget).getAll("week").map(Number);
                      void run(
                        () =>
                          callApi(
                            `${base}/materials`,
                            jsonRequest("PATCH", {
                              action: "assign",
                              documentId: document.id,
                              weekNumbers: selected,
                            }),
                          ),
                        "Material asociado a las semanas seleccionadas.",
                      );
                    }}
                  >
                    <h3>{document.filename}</h3>
                    {data.weeks.map((week) => (
                      <label className={styles.check} key={week.week_number}>
                        <input
                          type="checkbox"
                          name="week"
                          value={week.week_number}
                          defaultChecked={data.assignments.some(
                            (assignment) =>
                              assignment.document_id === document.id &&
                              assignment.week_number === week.week_number,
                          )}
                        />
                        Semana {week.week_number}: {week.topic}
                      </label>
                    ))}
                    <Button variant="secondary" type="submit" loading={busy}>
                      Guardar asignación
                    </Button>
                  </form>
                ))}
            </section>
            <section>
              <h2>4. Genera y revisa los retos</h2>
              {data.weeks.map((week) => (
                <div className={styles.row} key={week.week_number}>
                  <p>
                    Semana {week.week_number}: {week.topic}
                  </p>
                  <Button
                    loading={busy}
                    onClick={() =>
                      run(
                        () =>
                          callApi(
                            `${base}/generation`,
                            jsonRequest("POST", { weekNumber: week.week_number }),
                          ),
                        "Reto generado como borrador. Revisa la solución antes de publicarlo.",
                      )
                    }
                  >
                    Generar un reto
                  </Button>
                </div>
              ))}
              {data.challenges.map((challenge) => (
                <article key={challenge.id}>
                  <h3>
                    Semana {challenge.week_number} · {challenge.game} · Nivel {challenge.difficulty} ·{" "}
                    {{ draft: "Borrador", published: "Publicado", discarded: "Descartado" }[challenge.status]}
                  </h3>
                  <details>
                    <summary>Revisar datos, solución y fuente</summary>
                    <pre>
                      {JSON.stringify(
                        { contenido: challenge.payload, solucion: challenge.solution },
                        null,
                        2,
                      )}
                    </pre>
                    <p>{challenge.explanation}</p>
                    <blockquote>{challenge.evidence}</blockquote>
                  </details>
                  <div className={styles.row}>
                    <Button
                      disabled={challenge.status === "published"}
                      loading={busy}
                      onClick={() =>
                        run(
                          () =>
                            callApi(
                              `${base}/generation`,
                              jsonRequest("PATCH", { challengeId: challenge.id, status: "published" }),
                            ),
                          "Reto publicado.",
                        )
                      }
                    >
                      Confirmar y publicar
                    </Button>
                    <Button
                      variant="secondary"
                      loading={busy}
                      onClick={() =>
                        run(
                          () =>
                            callApi(
                              `${base}/generation`,
                              jsonRequest("PATCH", { challengeId: challenge.id, status: "discarded" }),
                            ),
                          "Reto descartado.",
                        )
                      }
                    >
                      Descartar
                    </Button>
                  </div>
                </article>
              ))}
              <Link href={`/cursos/${encodeURIComponent(courseId)}/practicar`}>
                Ver los retos publicados de la semana activa
              </Link>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
