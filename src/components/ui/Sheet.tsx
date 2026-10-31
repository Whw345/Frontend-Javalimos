"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  closeLabel: string;
  /** "bottom": bottom sheet en móvil; "right": panel lateral en tablet. */
  side?: "bottom" | "right";
  children: ReactNode;
}

/** Panel deslizante sobre Radix Dialog (§9.3). */
export function Sheet({ open, onOpenChange, title, closeLabel, side = "bottom", children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-(--z-overlay) bg-bg/80 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed z-(--z-modal) flex flex-col gap-4 border-border bg-surface-raised p-4 shadow-lg md:p-6",
            side === "bottom"
              ? "inset-x-0 bottom-0 max-h-[80dvh] rounded-t-xl border-t pb-[max(1rem,env(safe-area-inset-bottom))]"
              : "inset-y-0 right-0 w-[min(22rem,100%)] border-l",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Dialog.Title className="type-h3 text-text">{title}</Dialog.Title>
            <Dialog.Close
              aria-label={closeLabel}
              className="inline-flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-surface hover:text-text focus-visible:shadow-glow-primary"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
