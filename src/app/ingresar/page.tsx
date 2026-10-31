"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "@/components/materials/Workspace.module.css";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [courseId, setCourseId] = useState("bio-101");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
      });
      const body = await response.json();
      setMessage(response.ok ? "Sesión iniciada. Elige cómo continuar." : body.message);
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.workspace}>
      <main>
        <h1>Ingresa a Javalimos</h1>
        <section>
          <form onSubmit={login}>
            <label>
              Correo institucional
              <input name="email" type="email" required autoComplete="username" />
            </label>
            <label>
              Contraseña
              <input name="password" type="password" required autoComplete="current-password" />
            </label>
            <Button type="submit" loading={busy}>
              Ingresar
            </Button>
          </form>
          <p role="status">{message}</p>
        </section>
        <section>
          <label>
            Identificador del curso
            <input value={courseId} onChange={(event) => setCourseId(event.target.value)} />
          </label>
          <Link href={`/docente/${encodeURIComponent(courseId)}`}>Gestionar material como docente</Link>
          <Link href={`/cursos/${encodeURIComponent(courseId)}/practicar`}>Practicar retos publicados</Link>
        </section>
      </main>
    </div>
  );
}
