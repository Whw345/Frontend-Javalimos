"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CuyFrontal } from "@/components/brand/CuyFrontal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { copy } from "@/content/copy";
import { createCourse, getCourses, uploadPdf } from "@/lib/api/teacher";
import { MAX_PDF_BYTES, MAX_PDF_MB } from "@/lib/config";
import { TeacherHeader } from "./TeacherHeader";

const t = copy.teacher.upload;
const MAX_WEEKS = 20;
const WEEKS = Array.from({ length: MAX_WEEKS }, (_, index) => index + 1);

type UploadStatus = "ready" | "uploading" | "done" | "error";
interface UploadItem {
  key: string;
  file: File;
  week: number;
  status: UploadStatus;
  error?: string;
}

const isPdf = (file: File) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

function StatusIcon({ item }: { item: UploadItem }) {
  if (item.status === "uploading")
    return <LoaderCircle aria-hidden className="size-5 animate-spin text-primary-text" />;
  if (item.status === "done") return <CircleCheck aria-hidden className="size-5 text-success" />;
  if (item.status === "error") return <CircleX aria-hidden className="size-5 text-error" />;
  return null;
}

/** Pantalla de carga: crea el curso al subir, o completa uno que quedó sin material. */
export function CourseUpload({ existingCourseId }: { existingCourseId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const access = useQuery({
    queryKey: ["teacher", "courses"],
    queryFn: getCourses,
    enabled: !existingCourseId,
    retry: false,
  });
  const notAllowed = access.data?.canCreateCourses === false || access.isError;
  useEffect(() => {
    if (notAllowed) router.replace("/cursos");
  }, [notAllowed, router]);
  const input = useRef<HTMLInputElement>(null);
  const [courseId, setCourseId] = useState(existingCourseId);
  const [name, setName] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback((files: File[]) => {
    const rejected = files.find((file) => !isPdf(file));
    const tooLarge = files.find((file) => isPdf(file) && file.size > MAX_PDF_BYTES);
    setMessage(rejected ? t.notPdf : tooLarge ? t.tooLarge(tooLarge.name, MAX_PDF_MB) : "");
    const accepted = files.filter((file) => isPdf(file) && file.size <= MAX_PDF_BYTES);
    setItems((current) => [
      ...current,
      ...accepted.map((file) => ({
        key: crypto.randomUUID(),
        // Algunos navegadores no informan el tipo al arrastrar; el servidor lo exige.
        file: file.type ? file : new File([file], file.name, { type: "application/pdf" }),
        week: 1,
        status: "ready" as const,
      })),
    ]);
  }, []);

  // Se arrastra a toda la ventana, no a una zona concreta.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes("Files");
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setDragging(true);
    };
    const onLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const onOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      depth = 0;
      setDragging(false);
      addFiles([...(event.dataTransfer?.files ?? [])]);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [addFiles]);

  function update(key: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const id = courseId ?? (await createCourse(name.trim())).id;
      setCourseId(id);
      let failed = false;
      // De uno en uno: cada PDF se convierte a Markdown en el servidor.
      for (const item of items.filter((candidate) => candidate.status !== "done")) {
        update(item.key, { status: "uploading", error: undefined });
        try {
          await uploadPdf(id, item.file, item.week);
          update(item.key, { status: "done" });
        } catch (error) {
          failed = true;
          update(item.key, {
            status: "error",
            error: error instanceof Error ? error.message : copy.errors.UNKNOWN,
          });
        }
      }
      if (failed) {
        setMessage(t.partialFailure);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["teacher"] });
      router.push(`/docente/${id}/camino`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.errors.UNKNOWN);
    } finally {
      setBusy(false);
    }
  }

  const done = items.filter((item) => item.status === "done").length;
  const needsName = !courseId;
  return (
    <div className="flex h-dvh flex-col gap-4 bg-bg px-4 py-6 md:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4">
        <TeacherHeader />
        <main className="flex min-h-0 flex-1 flex-col gap-4 rounded-xl border border-border bg-surface p-4 lg:p-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="type-h1 text-text">{t.title}</h1>
            <Button
              variant="secondary"
              size="icon"
              aria-label={t.add}
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Plus aria-hidden />
            </Button>
            <input
              ref={input}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              hidden
              data-testid="pdf-input"
              onChange={(event) => {
                addFiles([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
          </div>
          {needsName && (
            <label className="flex flex-col gap-2 type-label text-text-secondary">
              {t.nameLabel}
              <Input
                value={name}
                maxLength={120}
                placeholder={t.namePlaceholder}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <p role="status" aria-live="polite" className="type-body text-text-secondary empty:hidden">
            {message}
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto pt-3 pr-3">
            {items.length === 0 ? (
              <EmptyState
                className="py-8"
                title={t.empty}
                description={t.emptyHint}
                action={<CuyFrontal expresion="animo" size={88} />}
              />
            ) : (
              <ul className="flex flex-col gap-5">
                {items.map((item) => (
                  <li key={item.key} className="relative">
                    <div className="flex items-center gap-3 rounded-lg border border-border-strong bg-surface-raised p-3">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary-soft type-label text-primary-text">
                        PDF
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate type-body text-text">{item.file.name}</p>
                        {item.error && <p className="type-caption text-error">{item.error}</p>}
                      </div>
                      <StatusIcon item={item} />
                      <select
                        aria-label={t.weekLabel(item.file.name)}
                        value={item.week}
                        disabled={busy || item.status === "done"}
                        onChange={(event) => update(item.key, { week: Number(event.target.value) })}
                        className="size-12 shrink-0 appearance-none rounded-md border border-border-strong bg-surface-sunken text-center type-label text-text focus-visible:border-primary focus-visible:shadow-glow-primary"
                      >
                        {WEEKS.map((week) => (
                          <option key={week} value={week}>
                            {t.week(week)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {item.status !== "done" && (
                      <button
                        type="button"
                        aria-label={t.remove(item.file.name)}
                        disabled={busy}
                        onClick={() => setItems((current) => current.filter(({ key }) => key !== item.key))}
                        className="group absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full disabled:opacity-40"
                      >
                        <span className="flex size-8 items-center justify-center rounded-full border-2 border-error bg-surface text-error transition-colors duration-(--duration-fast) group-hover:bg-error-soft group-focus-visible:shadow-glow-primary">
                          <Trash2 aria-hidden className="size-4" />
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            size="lg"
            className="mx-auto w-full max-w-md"
            loading={busy}
            disabled={!items.length || (needsName && name.trim().length < 3)}
            onClick={submit}
          >
            {busy ? t.progress(done, items.length) : t.submit}
          </Button>
        </main>
      </div>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-(--z-overlay) flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <p className="rounded-xl border-2 border-dashed border-primary bg-primary-soft px-8 py-6 type-h2 text-text">
            {t.dropHere}
          </p>
        </div>
      )}
    </div>
  );
}
