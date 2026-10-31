"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Button } from "@/components/ui/Button";
import { cardVariants } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { copy } from "@/content/copy";
import { ApiError } from "@/lib/api/client";
import { getCourses, type CourseCard } from "@/lib/api/teacher";
import { cn } from "@/lib/utils/cn";
import { TeacherHeader } from "./TeacherHeader";

const t = copy.teacher.courses;

function courseHref(course: CourseCard) {
  return course.role === "teacher" ? `/docente/${course.id}` : `/cursos/${course.id}/practicar`;
}

function courseState(course: CourseCard) {
  if (course.role !== "teacher") return t.student;
  return course.setupCompleted ? t.ready : t.inSetup;
}

export function CourseList() {
  const router = useRouter();
  const courses = useQuery({
    queryKey: ["teacher", "courses"],
    queryFn: getCourses,
    staleTime: 0,
    retry: false,
  });
  const unauthorized = courses.error instanceof ApiError && courses.error.status === 401;
  useEffect(() => {
    if (unauthorized) router.replace("/ingresar");
  }, [unauthorized, router]);

  return (
    <div className="min-h-dvh bg-bg px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8">
        <TeacherHeader />
        <div>
          <h1 className="type-h1 text-text">{t.title}</h1>
          <p className="mt-1 type-body text-text-secondary">
            {courses.data && !courses.data.canCreateCourses ? t.studentSubtitle : t.subtitle}
          </p>
        </div>
        {courses.isError && !unauthorized ? (
          <EmptyState
            title={t.loadFailed}
            action={
              <Button variant="secondary" onClick={() => courses.refetch()}>
                {copy.common.retry}
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.data?.canCreateCourses && (
              <li>
                <Link
                  href="/docente/nuevo"
                  className={cn(
                    cardVariants({ interactive: true }),
                    "flex h-full min-h-44 flex-col items-center justify-center gap-2 border-2 border-dashed border-border-strong bg-transparent text-center focus-visible:shadow-glow-primary",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-md bg-primary-soft text-primary-text">
                    <Plus aria-hidden className="size-6" />
                  </span>
                  <span className="type-h3 text-text">{t.create}</span>
                  <span className="type-caption text-text-secondary">{t.createHint}</span>
                </Link>
              </li>
            )}
            {courses.isPending &&
              [0, 1].map((key) => (
                <li key={key}>
                  <Skeleton className="h-44" />
                </li>
              ))}
            {courses.data?.courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={courseHref(course)}
                  className={cn(
                    cardVariants({ interactive: true }),
                    "flex h-full min-h-44 flex-col gap-3 focus-visible:shadow-glow-primary",
                  )}
                >
                  <span className="flex size-12 items-center justify-center rounded-md bg-primary-soft text-primary-text">
                    <BookOpen aria-hidden className="size-6" />
                  </span>
                  <span className="type-h3 text-text">{course.name}</span>
                  <span className="mt-auto flex items-center justify-between gap-2">
                    <span className="type-caption text-text-secondary">
                      {t.summary(course.weeks, course.games)}
                    </span>
                    <span className="rounded-sm bg-surface-raised px-2 py-1 type-caption text-text-secondary">
                      {courseState(course)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {courses.data?.courses.length === 0 && (
          <div className="flex items-center justify-center gap-3 text-text-secondary">
            <CuyFrontal expresion="animo" size={64} />
            <p className="type-body">{courses.data.canCreateCourses ? t.createHint : t.noCourses}</p>
          </div>
        )}
      </div>
    </div>
  );
}
