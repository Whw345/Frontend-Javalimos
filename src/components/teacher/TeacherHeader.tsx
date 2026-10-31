"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { authClient } from "@/lib/auth-client";

export function TeacherHeader() {
  const router = useRouter();
  async function signOut() {
    await authClient.signOut();
    router.replace("/ingresar");
  }
  return (
    <header className="flex items-center justify-between gap-4">
      <Link
        href="/cursos"
        aria-label={copy.teacher.backToCourses}
        className="rounded-md focus-visible:shadow-glow-primary"
      >
        <Logo />
      </Link>
      <Button variant="ghost" size="sm" onClick={signOut}>
        <LogOut aria-hidden />
        {copy.teacher.signOut}
      </Button>
    </header>
  );
}
