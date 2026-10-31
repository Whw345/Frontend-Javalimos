"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { copy } from "@/content/copy";
import { authClient } from "@/lib/auth-client";

const t = copy.auth;
const AFTER_LOGIN = "/cursos";

function oauthMessage(error: string | null) {
  if (!error) return "";
  return error === "account_not_linked" ? t.existingAccount : t.googleFailed;
}

function LoginForm() {
  const router = useRouter();
  const oauthError = useSearchParams().get("error");
  const { data: session } = authClient.useSession();
  const [message, setMessage] = useState(() => oauthMessage(oauthError));
  const [busy, setBusy] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  useEffect(() => {
    if (session) router.replace(AFTER_LOGIN);
  }, [session, router]);
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
        setMessage(signingUp ? t.signUpFailed : t.badCredentials);
      } else {
        router.replace(AFTER_LOGIN);
      }
    } catch {
      setMessage(t.offline);
    } finally {
      setBusy(false);
    }
  }
  async function loginWithGoogle() {
    setBusy(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: AFTER_LOGIN,
      errorCallbackURL: "/ingresar",
    });
    if (error) {
      setMessage(oauthMessage("google"));
      setBusy(false);
    }
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4 py-8">
      <main className="flex w-full max-w-md flex-col gap-6">
        <Logo tagline className="self-center" />
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 lg:p-6">
          <div>
            <h1 className="type-h2 text-text">{t.title}</h1>
            <p className="mt-1 type-body text-text-secondary">{t.subtitle}</p>
          </div>
          <form onSubmit={login} className="flex flex-col gap-4">
            {signingUp && (
              <label className="flex flex-col gap-2 type-label text-text-secondary">
                {t.name}
                <Input name="name" required autoComplete="name" />
              </label>
            )}
            <label className="flex flex-col gap-2 type-label text-text-secondary">
              {t.email}
              <Input name="email" type="email" required autoComplete="username" />
            </label>
            <label className="flex flex-col gap-2 type-label text-text-secondary">
              {t.password}
              <Input
                name="password"
                type="password"
                required
                minLength={signingUp ? 8 : undefined}
                autoComplete={signingUp ? "new-password" : "current-password"}
              />
            </label>
            <Button type="submit" size="lg" loading={busy}>
              {signingUp ? t.signUp : t.signIn}
            </Button>
          </form>
          <Button type="button" variant="secondary" disabled={busy} onClick={loginWithGoogle}>
            {t.google}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSigningUp(!signingUp)}>
            {signingUp ? t.toSignIn : t.toSignUp}
          </Button>
          <p role="status" className="type-body text-text-secondary empty:hidden">
            {message}
          </p>
        </div>
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
