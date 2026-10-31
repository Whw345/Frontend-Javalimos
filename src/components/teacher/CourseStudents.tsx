"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { copy } from "@/content/copy";
import { assignStudents, getStudents, removeStudent } from "@/lib/api/teacher";

const t = copy.teacher.admin.students;

export function CourseStudents({ courseId }: { courseId: string }) {
  const queryClient = useQueryClient();
  const [emails, setEmails] = useState("");
  const students = useQuery({
    queryKey: ["teacher", "students", courseId],
    queryFn: () => getStudents(courseId),
    staleTime: 0,
    retry: false,
  });
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["teacher", "students", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["teacher", "leaderboard", courseId] }),
    ]);
  const assign = useMutation({
    mutationFn: () =>
      assignStudents(
        courseId,
        emails.split(/[\s,;]+/).filter((email) => email),
      ),
    onSuccess: async () => {
      setEmails("");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (email: string) => removeStudent(courseId, email),
    onSuccess: refresh,
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    assign.mutate();
  }
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Card className="flex flex-col gap-4 self-start lg:order-last lg:col-span-4">
        <div>
          <h2 className="type-h3 text-text">{t.title}</h2>
          <p className="mt-1 type-body text-text-secondary">{t.hint}</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2 type-label text-text-secondary">
            {t.emails}
            <Textarea
              value={emails}
              rows={4}
              placeholder={t.placeholder}
              onChange={(event) => setEmails(event.target.value)}
            />
          </label>
          <Button type="submit" loading={assign.isPending} disabled={!emails.trim()}>
            {t.assign}
          </Button>
        </form>
        <div role="status" aria-live="polite" className="type-body empty:hidden">
          {assign.isError && <p className="text-error">{assign.error.message}</p>}
          {assign.isSuccess && (
            <p className="text-text-secondary">{t.assigned(assign.data.enrolled, assign.data.invited)}</p>
          )}
        </div>
      </Card>
      <section className="flex flex-col gap-4 lg:col-span-8">
        {students.isPending && <Skeleton className="h-64" />}
        {students.isError && (
          <EmptyState
            title={t.loadFailed}
            action={
              <Button variant="secondary" onClick={() => students.refetch()}>
                {copy.common.retry}
              </Button>
            }
          />
        )}
        {students.data?.students.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CuyFrontal expresion="animo" size={96} />
            <EmptyState title={t.empty} description={t.emptyHint} />
          </div>
        )}
        {!!students.data?.students.length && (
          <>
            <h2 className="type-h2 text-text">{t.listTitle(students.data.students.length)}</h2>
            <ul className="flex flex-col gap-2">
              {students.data.students.map((student) => (
                <li
                  key={student.email}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  <Avatar name={student.name ?? student.email} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate type-body text-text">{student.name ?? student.email}</p>
                    <p className="truncate type-caption text-text-muted">
                      {student.pending ? t.pendingHint : student.email}
                    </p>
                  </div>
                  {student.pending && (
                    <span className="rounded-sm bg-surface-raised px-2 py-1 type-caption text-text-secondary">
                      {t.pending}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.remove(student.email)}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(student.email)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
        {remove.isError && (
          <p role="alert" className="type-body text-error">
            {remove.error.message}
          </p>
        )}
      </section>
    </div>
  );
}
