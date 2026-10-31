"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { fieldClasses, Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { Textarea } from "@/components/ui/Textarea";
import { copy } from "@/content/copy";
import { getGame, saveGame, type EditableGame } from "@/lib/api/teacher";
import { gameCatalog, type ArgField, type ColumnField } from "@/lib/games/catalog";
import { cn } from "@/lib/utils/cn";

const t = copy.teacher.editor;

type Row = Record<string, unknown>;

function emptyCell(column: ColumnField) {
  if (column.kind === "boolean") return false;
  return column.kind === "choice" ? column.options[0] : "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 type-label text-text-secondary">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 type-label text-text-secondary">
      <input
        type="checkbox"
        className="size-5 accent-primary"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function Cell({
  column,
  value,
  onChange,
}: {
  column: ColumnField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (column.kind === "boolean")
    return <Toggle label={column.label} value={value === true} onChange={onChange} />;
  if (column.kind === "choice")
    return (
      <Field label={column.label}>
        <select
          className={cn(fieldClasses, "h-11")}
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {column.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
    );
  return (
    <Field label={column.label}>
      <Input
        value={String(value ?? "")}
        maxLength={column.max}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function ListField({
  field,
  value,
  onChange,
}: {
  field: Extract<ArgField, { kind: "list" }>;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 type-label text-text-secondary">{field.label}</legend>
      {value.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={t.item(field.label, index + 1)}
            value={item}
            maxLength={field.itemMax}
            onChange={(event) =>
              onChange(value.map((other, position) => (position === index ? event.target.value : other)))
            }
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.removeItem(field.label, index + 1)}
            disabled={value.length <= field.min}
            onClick={() => onChange(value.filter((_, position) => position !== index))}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={value.length >= field.max}
        onClick={() => onChange([...value, ""])}
      >
        <Plus aria-hidden />
        {t.add}
      </Button>
    </fieldset>
  );
}

function TableField({
  field,
  value,
  onChange,
}: {
  field: Extract<ArgField, { kind: "table" }>;
  value: Row[];
  onChange: (value: Row[]) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 type-label text-text-secondary">{field.label}</legend>
      {value.map((row, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3">
          {field.columns.map((column) => (
            <Cell
              key={column.name}
              column={column}
              value={row[column.name]}
              onChange={(cell) =>
                onChange(
                  value.map((other, position) =>
                    position === index ? { ...other, [column.name]: cell } : other,
                  ),
                )
              }
            />
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="self-end"
            disabled={value.length <= field.min}
            onClick={() => onChange(value.filter((_, position) => position !== index))}
          >
            <Trash2 aria-hidden />
            {t.remove}
          </Button>
        </div>
      ))}
      <Button
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={value.length >= field.max}
        onClick={() =>
          onChange([
            ...value,
            Object.fromEntries(field.columns.map((column) => [column.name, emptyCell(column)])),
          ])
        }
      >
        <Plus aria-hidden />
        {t.add}
      </Button>
    </fieldset>
  );
}

function ArgInput({
  field,
  value,
  onChange,
}: {
  field: ArgField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (field.kind === "list")
    return <ListField field={field} value={(value as string[]) ?? []} onChange={onChange} />;
  if (field.kind === "table")
    return <TableField field={field} value={(value as Row[]) ?? []} onChange={onChange} />;
  if (field.kind === "boolean")
    return <Toggle label={field.label} value={value === true} onChange={onChange} />;
  if (field.kind === "number")
    return (
      <Field label={field.label}>
        <Input
          type="number"
          min={field.min}
          max={field.max}
          value={Number(value ?? field.min)}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </Field>
    );
  return (
    <Field label={field.label}>
      {field.long ? (
        <Textarea
          value={String(value ?? "")}
          maxLength={field.max}
          showCount
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          value={String(value ?? "")}
          maxLength={field.max}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

function EditorForm({
  courseId,
  game,
  onClose,
}: {
  courseId: string;
  game: EditableGame;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<Row>(game.content ?? {});
  const save = useMutation({
    mutationFn: () => saveGame(courseId, game.id, content),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["teacher"] });
      onClose();
    },
  });
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      {gameCatalog[game.game].args.map((field) => (
        <ArgInput
          key={field.name}
          field={field}
          value={content[field.name]}
          onChange={(value) => setContent((current) => ({ ...current, [field.name]: value }))}
        />
      ))}
      <blockquote className="border-l-2 border-primary pl-3 type-body text-text-secondary">
        <p className="mb-1 type-caption text-text-muted">
          {t.evidence}: {game.source.documento}
        </p>
        {game.evidence}
      </blockquote>
      {save.isError && (
        <p role="alert" className="type-body text-error">
          {save.error.message}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose}>
          {t.cancel}
        </Button>
        <Button type="submit" loading={save.isPending}>
          {t.save}
        </Button>
      </div>
    </form>
  );
}

export function GameEditor({
  courseId,
  gameId,
  onClose,
}: {
  courseId: string;
  gameId: string;
  onClose: () => void;
}) {
  const game = useQuery({
    queryKey: ["teacher", "game", gameId],
    queryFn: () => getGame(courseId, gameId),
    staleTime: 0,
    gcTime: 0,
  });
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-bg/80 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-(--z-modal) max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-surface-raised p-4 shadow-lg lg:p-6"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="type-h2 text-text">
                {game.data ? t.title(gameCatalog[game.data.game].name) : copy.common.loading}
              </Dialog.Title>
              {game.data && (
                <p className="mt-1 type-caption text-text-muted">
                  {t.meta(game.data.weekNumber, game.data.difficulty)}
                </p>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label={t.close}>
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>
          {game.isPending && <Skeleton className="h-64" />}
          {game.isError && <p className="type-body text-error">{t.loadFailed}</p>}
          {game.data && <EditorForm courseId={courseId} game={game.data} onClose={onClose} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
