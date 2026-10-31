"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { ApiError } from "@/lib/api/client";
import { getCoursePath } from "@/lib/api/teacher";
import { TeacherHeader } from "./TeacherHeader";

const t = copy.teacher;

/** Pantalla de administración: por ahora vacía. Un curso sin terminar vuelve a su camino. */
export function CourseAdmin({ courseId }: { courseId: string }) {
  const router = useRouter();
  const path = useQuery({
    queryKey: ["teacher", "course", courseId],
    queryFn: () => getCoursePath(courseId),
    staleTime: 0,
    retry: false,
  });
  const unauthorized = path.error instanceof ApiError && path.error.status === 401;
  const inSetup = path.data?.course.setupCompleted === false;
  useEffect(() => {
    if (unauthorized) router.replace("/ingresar");
    if (inSetup) router.replace(`/docente/${courseId}/camino`);
  }, [unauthorized, inSetup, courseId, router]);

  return (
    <div className="min-h-dvh bg-bg px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <TeacherHeader />
        {path.isPending && <Skeleton className="h-64" />}
        {path.isError && !unauthorized && <EmptyState title={t.path.loadFailed} />}
        {path.data?.course.setupCompleted && (
          <main className="flex flex-col gap-8">
            <div>
              <p className="type-overline text-text-muted">{t.admin.title}</p>
              <h1 className="type-h1 text-text">{path.data.course.name}</h1>
            </div>
            <div className="flex flex-col items-center gap-4 py-12">
              <CuyFrontal expresion="feliz" size={120} />
              <EmptyState
                title={t.admin.empty}
                description={t.admin.emptyHint}
                action={
                  <Link href="/cursos" className={buttonVariants({ variant: "secondary" })}>
                    {t.backToCourses}
                  </Link>
                }
              />
            </div>
          </main>
        )}
      </div>
    </div>
  );
}
