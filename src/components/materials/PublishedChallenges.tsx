"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createChallenge } from "@/lib/api/challenges";
import type { CreateChallengeBody } from "@/lib/api/schemas";
import styles from "./Workspace.module.css";

type Published = {
  id: string;
  game: CreateChallengeBody["game"];
  difficulty: CreateChallengeBody["difficulty"];
};
export function PublishedChallenges({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [data, setData] = useState<{
    course: { name: string; current_week: number };
    challenges: Published[];
  } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch(`/api/courses/${encodeURIComponent(courseId)}/challenges`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message);
        if (active) setData(body);
      })
      .catch((error: Error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [courseId]);
  async function play(challenge: Published) {
    setBusy(true);
    try {
      const session = await createChallenge(courseId, {
        game: challenge.game,
        difficulty: challenge.difficulty,
        challengeId: challenge.id,
      });
      router.push(`/reto/${session.sessionId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar el reto.");
      setBusy(false);
    }
  }
  return (
    <div className={styles.workspace}>
      <main>
        <h1>{data?.course.name ?? "Retos del curso"}</h1>
        <p role="status">{message}</p>
        <Link href="/ingresar">Cambiar sesión</Link>
        {data && (
          <section>
            <h2>Semana {data.course.current_week}</h2>
            <p>Practica hasta diez retos por semana. Cada reto se puede jugar una sola vez.</p>
            {!data.challenges.length && <p>El docente aún no ha publicado retos para esta semana.</p>}
            {data.challenges.map((challenge) => (
              <article key={challenge.id}>
                <h3>
                  {
                    ({ hueco: "Hueco", parejas: "Parejas", ordena: "Ordena" } as Record<string, string>)[
                      challenge.game
                    ]
                  }{" "}
                  · Nivel {challenge.difficulty}
                </h3>
                <Button loading={busy} onClick={() => play(challenge)}>
                  Jugar
                </Button>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
