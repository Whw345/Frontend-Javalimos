"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gamepad2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs } from "radix-ui";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { ApiError } from "@/lib/api/client";
import { getCoursePath } from "@/lib/api/teacher";
import { CourseLeaderboard } from "./CourseLeaderboard";
import { CourseStudents } from "./CourseStudents";
import { LearningPath } from "./LearningPath";
import { TeacherHeader } from "./TeacherHeader";

const t = copy.teacher;
const tabs = [
  { value: "ranking", label: t.admin.tabs.ranking, icon: Trophy },
  { value: "students", label: t.admin.tabs.students, icon: Users },
  { value: "games", label: t.admin.tabs.games, icon: Gamepad2 },
];

function AdminTabs({ courseId, setupCompleted }: { courseId: string; setupCompleted: boolean }) {
  // Un curso en preparación abre en sus juegos: ahí sigue la generación y se termina.
  const [tab, setTab] = useState(setupCompleted ? "ranking" : "games");
  return (
    <Tabs.Root value={tab} onValueChange={setTab} className="flex flex-col gap-6">
      <Tabs.List
        aria-label={t.admin.tabsLabel}
        className="grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1 sm:self-start"
      >
        {tabs.map(({ value, label, icon: Icon }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-transparent px-3 type-label text-text-secondary transition-colors duration-(--duration-fast) hover:text-text focus-visible:shadow-glow-primary data-[state=active]:border-primary data-[state=active]:bg-primary-soft data-[state=active]:text-text sm:px-6"
          >
            <Icon aria-hidden className="size-5 shrink-0" />
            {label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="ranking" className="focus-visible:outline-none">
        <CourseLeaderboard courseId={courseId} onAssign={() => setTab("students")} />
      </Tabs.Content>
      <Tabs.Content value="students" className="focus-visible:outline-none">
        <CourseStudents courseId={courseId} />
      </Tabs.Content>
      <Tabs.Content value="games" className="focus-visible:outline-none">
        <LearningPath courseId={courseId} embedded />
      </Tabs.Content>
    </Tabs.Root>
  );
}

/** Pantalla de un curso del docente: ranking, alumnos y juegos en pestañas. */
export function CourseAdmin({ courseId }: { courseId: string }) {
  const router = useRouter();
  const path = useQuery({
    queryKey: ["teacher", "course", courseId],
    queryFn: () => getCoursePath(courseId),
    staleTime: 0,
    retry: false,
  });
  const unauthorized = path.error instanceof ApiError && path.error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/ingresar");
  }, [unauthorized, router]);

  return (
    <div className="min-h-dvh bg-bg px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <TeacherHeader />
        {path.isPending && <Skeleton className="h-64" />}
        {path.isError && !unauthorized && (
          <EmptyState
            title={t.path.loadFailed}
            action={
              <Link href="/cursos" className={buttonVariants({ variant: "secondary" })}>
                {t.backToCourses}
              </Link>
            }
          />
        )}
        {path.data && (
          <main className="flex flex-col gap-6">
            <div className="flex flex-col items-start gap-2">
              <Link href="/cursos" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                <ArrowLeft aria-hidden />
                {t.backToCourses}
              </Link>
              <p className="type-overline text-text-muted">{t.admin.title}</p>
              <h1 className="type-h1 text-text">{path.data.course.name}</h1>
            </div>
            <AdminTabs courseId={courseId} setupCompleted={path.data.course.setupCompleted} />
          </main>
        )}
      </div>
    </div>
  );
}
