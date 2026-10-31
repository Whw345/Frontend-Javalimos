"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import styles from "@/components/materials/Workspace.module.css";
import { authClient } from "@/lib/auth-client";

function oauthMessage(error: string | null) {
  if (!error) return "";
  return error === "account_not_linked"
    ? "Este correo ya tiene una cuenta. Ingresa con tu contraseña."
    : "No se pudo ingresar con Google. Inténtalo de nuevo.";
}

function LoginForm() {
  const oauthError = useSearchParams().get("error");
  const { data: session, refetch } = authClient.useSession();
  const [message, setMessage] = useState(() => oauthMessage(oauthError));
  const [busy, setBusy] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [courseId, setCourseId] = useState("bio-101");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      const data = new FormData(event.currentTarget);
      const email = String(data.get("email"));
      const password = String(data.get("password"));
      const { error } = signingUp
        ? await authClient.signUp.email({ name: String(data.get("name")), email, password })
        : await authClient.signIn.email({ email, password });
      if (error) {
        setMessage(signingUp ? "No se pudo crear la cuenta." : "Correo o contraseña incorrectos.");
      } else {
        setMessage("Sesión iniciada. Elige cómo continuar.");
        refetch();
      }
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }
  async function loginWithGoogle() {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/ingresar",
      errorCallbackURL: "/ingresar",
    });
    if (error) {
      setMessage(oauthMessage("google"));
      setBusy(false);
    }
  }
  async function logout() {
    await authClient.signOut();
    setMessage("Sesión cerrada.");
    refetch();
  }
  return (
    <div className={styles.workspace}>
      <main>
        <h1>Ingresa a Javalimos</h1>
        <section>
          <form onSubmit={login}>
            {signingUp && (
              <label>
                Nombre
                <input name="name" required autoComplete="name" />
              </label>
            )}
            <label>
              Correo institucional
              <input name="email" type="email" required autoComplete="username" />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                required
                minLength={signingUp ? 8 : undefined}
                autoComplete={signingUp ? "new-password" : "current-password"}
              />
            </label>
            <Button type="submit" loading={busy}>
              {signingUp ? "Crear cuenta" : "Ingresar"}
            </Button>
          </form>
          <Button type="button" variant="secondary" disabled={busy} onClick={loginWithGoogle}>
            Continuar con Google
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSigningUp(!signingUp)}>
            {signingUp ? "Ya tengo una cuenta" : "Crear una cuenta"}
          </Button>
          <p role="status">
            {message || (session ? `Sesión iniciada como ${session.user.email}. Elige cómo continuar.` : "")}
          </p>
          {session && (
            <Button type="button" variant="ghost" onClick={logout}>
              Cerrar sesión
            </Button>
          )}
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
